import {
	S3_ACCESS_KEY_ID,
	S3_ENDPOINT,
	S3_PUBLIC_ENDPOINT,
	S3_REGION,
	S3_SECRET_ACCESS_KEY
} from '$app/env/private';
import type { FileField, FileKind } from './files';
import { createStorage, filePurpose, objectKey, type Storage } from './storageClient';

let instance: Storage | undefined;

/** The app's bucket. Built on first use, so analysing the app during `vite build` needs no S3. */
export function storage(): Storage {
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
 * The URL of a row's file, straight from the bucket, or null when the row holds none - or the
 * reader may not see it: a column mask reads as null, so the abilities decide who gets a URL.
 * The key follows from the row, so no lookup is needed: `claimUploadedFile` only stores a file
 * uploaded for this purpose of this conference, under `objectKey` of the two.
 */
export function fileUrl<K extends FileKind>(
	kind: K,
	field: FileField<K>,
	conferenceId: string,
	fileId: string | null,
	fileName?: string
) {
	if (!fileId) return null;
	return storage().presignDownload(
		objectKey(conferenceId, filePurpose(kind, field), fileId),
		fileName
	);
}
