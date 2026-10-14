import { client } from '$lib/api/rumbleClient/client';
import { m } from '$lib/paraglide/messages';

/** Which file an upload is for, as `FILE_SOURCES` in `$api/services/files/files` lists them. */
export type UploadTarget =
	| { kind: 'conference'; field: ConferenceFileField; conferenceId: string }
	| { kind: 'place'; field: 'sitePlan'; conferenceId: string }
	| { kind: 'resolution'; field: 'content'; conferenceId: string };

export type ConferenceFileField =
	| 'image'
	| 'emblem'
	| 'logo'
	| 'contract'
	| 'guardianConsent'
	| 'mediaConsent'
	| 'termsAndConditions'
	| 'certificate';

/**
 * Uploads `file` straight to the storage, through a URL the API hands out for `target`, and
 * returns the id the mutation saving the row takes for it (`logoFileId`, `fileId`, …).
 *
 * Returning `undefined` for "no file" matters: the mutations treat `null` as "remove the file", so
 * a form submitted without touching an upload field has to leave the stored file alone.
 */
export async function uploadFile(
	file: File | undefined | null,
	target: UploadTarget
): Promise<string | undefined> {
	if (!file || file.size === 0) return undefined;
	const mimeType = file.type || 'application/octet-stream';

	const upload = await client.mutate.requestFileUpload({
		__args: { ...target, fileName: file.name, mimeType, size: file.size },
		fileId: true,
		uploadUrl: true
	});
	// Type and length are signed into the URL, so they have to be sent exactly as announced.
	const response = await fetch(upload.uploadUrl, {
		method: 'PUT',
		body: file,
		headers: { 'Content-Type': mimeType }
	});
	if (!response.ok) throw new Error(m.fileUploadFailed({ fileName: file.name }));
	return upload.fileId;
}
