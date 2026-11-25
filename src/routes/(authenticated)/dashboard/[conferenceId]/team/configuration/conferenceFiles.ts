import { uploadFile, type ConferenceFileField } from '#lib/api/uploadFile';

const CONFERENCE_FILE_FIELDS = [
	'image',
	'emblem',
	'logo',
	'contract',
	'guardianConsent',
	'mediaConsent',
	'termsAndConditions',
	'certificate'
] as const satisfies ConferenceFileField[];

/**
 * Uploads the picked files one by one and returns the `updateConference` arguments for them: the
 * new id, or `null` for a removed one. An untouched field gets no argument at all: the client sends
 * an `undefined` argument as `null`, which would remove the stored file.
 */
export async function uploadConferenceFiles({
	conferenceId,
	files
}: {
	conferenceId: string;
	files: Partial<Record<ConferenceFileField, File | null>>;
}) {
	const args: { [F in ConferenceFileField as `${F}FileId`]?: string | null } = {};
	for (const field of CONFERENCE_FILE_FIELDS) {
		const file = files[field];
		const fileId =
			file === null
				? null
				: await uploadFile({ file, target: { kind: 'conference', field, conferenceId } });
		if (fileId !== undefined) args[`${field}FileId` as const] = fileId;
	}
	return args;
}
