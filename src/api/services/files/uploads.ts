import { apiError } from '$api/services/apiError';
import { db, schema } from '$api/db/db';
import type { Context } from '$api/context';
import { assertTeamRole } from '$api/services/authHelper';
import { nanoid } from '$lib/helpers/nanoid';
import { m } from '$lib/paraglide/messages';
import { findFileSource, formatMegabytes, type FileField, type FileKind } from './files';
import { storage } from './storage';
import { objectKey } from './storageClient';

export interface UploadRequest {
	kind: string;
	field: string;
	conferenceId: string;
	fileName: string;
	mimeType: string;
	size: number;
}

/**
 * Prepares an upload: checks that the caller may upload this file for the conference and that it
 * is of an allowed type and size, records it, and returns the presigned URL the browser PUTs it
 * to. Nothing points at the file until a mutation claims it; one that never is gets removed by the
 * cleanup job.
 */
export async function requestUpload(ctx: Context, request: UploadRequest) {
	const user = ctx.mustBeLoggedIn();
	const source = findFileSource(request.kind, request.field);
	if (!source) throw apiError('INVALID_INPUT', m.fileUploadUnknownPurpose());
	await assertTeamRole(ctx, request.conferenceId, source.roles);

	if (!source.mimeTypes.includes(request.mimeType)) {
		throw apiError('INVALID_INPUT', m.fileUploadTypeNotAllowed());
	}
	if (!Number.isInteger(request.size) || request.size <= 0) {
		throw apiError('INVALID_INPUT', m.fileUploadEmpty());
	}
	if (request.size > source.maxBytes) {
		throw apiError('INVALID_INPUT', m.fileTooLarge({ max: formatMegabytes(source.maxBytes) }));
	}

	const id = nanoid();
	const key = objectKey(request.conferenceId, source.purpose, id);
	await db.insert(schema.storedFile).values({
		id,
		key,
		purpose: source.purpose,
		mimeType: request.mimeType,
		size: request.size,
		fileName: request.fileName.trim() || null,
		conferenceId: request.conferenceId,
		uploadedById: user.sub
	});

	const uploadUrl = await storage().presignUpload(key, request);
	return { fileId: id, uploadUrl };
}

/**
 * Checks that `fileId` may be stored in `field` of a `kind` row of `conferenceId`: the caller
 * uploaded it, for exactly that, and it arrived in full. Passes `null` (clear the field) and
 * `undefined` (leave it alone) through, so it wraps a mutation argument as it is.
 *
 * The caller's right to write the row itself is the mutation's business, as for any other column.
 */
export async function claimUploadedFile<K extends FileKind, V extends string | null | undefined>(
	ctx: Context,
	fileId: V,
	target: { kind: K; field: FileField<K>; conferenceId: string }
): Promise<V> {
	if (fileId === null || fileId === undefined) return fileId;
	const user = ctx.mustBeLoggedIn();
	const source = findFileSource(target.kind, target.field);

	const file = await db.query.storedFile.findFirst({
		where: { id: fileId },
		columns: { key: true, purpose: true, size: true, conferenceId: true, uploadedById: true }
	});
	if (
		!source ||
		!file ||
		file.purpose !== source.purpose ||
		file.conferenceId !== target.conferenceId ||
		file.uploadedById !== user.sub
	) {
		throw apiError('INVALID_INPUT', m.fileUploadNotUsable());
	}

	if ((await storage().sizeOf(file.key)) !== file.size) {
		throw apiError('CONFLICT', m.fileUploadIncomplete());
	}
	return fileId;
}
