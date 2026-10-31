import {
	S3_ACCESS_KEY_ID,
	S3_ENDPOINT,
	S3_PUBLIC_ENDPOINT,
	S3_REGION,
	S3_SECRET_ACCESS_KEY
} from '$app/env/private';
import { apiError } from '#api/services/errors';
import { db, schema } from '#api/db/db';
import { storedFilePubsub } from '#api/pubsub';
import { nanoid } from '#lib/helpers/nanoid';
import { m } from '#lib/paraglide/messages';
import { formatMegabytes, type findFileSource } from './fileSources';
import { createStorage, objectKey, type Storage } from './storageClient';

let instance: Storage | undefined;

/** The app's bucket. Built on first use, so analysing the app during `vite build` needs no S3. */
function storage(): Storage {
	instance ??= createStorage({
		endpoint: S3_ENDPOINT,
		publicEndpoint: S3_PUBLIC_ENDPOINT,
		accessKeyId: S3_ACCESS_KEY_ID,
		secretAccessKey: S3_SECRET_ACCESS_KEY,
		region: S3_REGION
	});
	return instance;
}

/**
 * A presigned URL serving the file straight from the bucket, named as it was uploaded. Who may have
 * it is decided before: the `storedFile` read rules, which follow the row holding the file.
 */
export function downloadUrl(file: { key: string; fileName: string | null }) {
	return storage().presignDownload({ key: file.key, fileName: file.fileName ?? undefined });
}

export interface UploadRequest {
	conferenceId: string;
	fileName: string;
	mimeType: string;
	size: number;
}

type FileSource = NonNullable<ReturnType<typeof findFileSource>>;

/**
 * Prepares an upload of a file for `source`: checks that it is of an allowed type and size,
 * records it as uploaded by `uploaderId`, and returns its id. The browser then PUTs the bytes to
 * the file's `uploadUrl`. Nothing points at the file until a mutation claims it; one that never is
 * gets removed by the cleanup job.
 *
 * Whether the uploader may upload it is `assertCanUploadFile`'s business.
 */
export async function requestUpload({
	source,
	uploaderId,
	request
}: {
	source: FileSource;
	uploaderId: string;
	request: UploadRequest;
}) {
	if (!source.mimeTypes.includes(request.mimeType)) {
		throw apiError({ code: 'INVALID_INPUT', message: m.fileUploadTypeNotAllowed() });
	}
	if (!Number.isInteger(request.size) || request.size <= 0) {
		throw apiError({ code: 'INVALID_INPUT', message: m.fileUploadEmpty() });
	}
	if (request.size > source.maxBytes) {
		throw apiError({
			code: 'INVALID_INPUT',
			message: m.fileTooLarge({ max: formatMegabytes(source.maxBytes) })
		});
	}

	const id = nanoid();
	const key = objectKey({
		conferenceId: request.conferenceId,
		purpose: source.purpose,
		uniqueId: id
	});
	await db.insert(schema.storedFile).values({
		id,
		key,
		purpose: source.purpose,
		mimeType: request.mimeType,
		size: request.size,
		fileName: request.fileName.trim() || null,
		uploadedById: uploaderId
	});
	storedFilePubsub.created();

	return id;
}

/**
 * Where the browser PUTs the file, or null once something has been uploaded under its key: a
 * stored file never changes after it arrived, which the download URLs and browsers' caches rely
 * on, so reading the row again must not hand out a way to overwrite it.
 */
export async function pendingUploadUrl(file: { key: string; mimeType: string; size: number }) {
	if ((await storage().sizeOf(file.key)) !== undefined) return null;
	return storage().presignUpload({ key: file.key, file });
}

/**
 * Refuses a file that has not arrived in the bucket in full. Passes `null` (clear the field) and
 * `undefined` (leave it alone) through, so it wraps a mutation argument as it is.
 *
 * Whether the caller may store the file where the mutation puts it is `assertCanClaimFile`'s
 * business; call that first.
 */
export async function ensureUploadComplete<V extends string | null | undefined>(
	fileId: V
): Promise<V> {
	if (fileId === null || fileId === undefined) return fileId;
	const file = await db.query.storedFile.findFirst({
		where: { id: fileId },
		columns: { key: true, size: true }
	});
	if (!file) throw apiError({ code: 'INVALID_INPUT', message: m.fileUploadNotUsable() });
	if ((await storage().sizeOf(file.key)) !== file.size) {
		throw apiError({ code: 'CONFLICT', message: m.fileUploadIncomplete() });
	}
	return fileId;
}
