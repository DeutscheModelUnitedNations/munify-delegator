import { z } from 'zod';
import type { TeamPermission } from '#lib/helpers/teamRoles';
import { MAX_RESOLUTION_FILE_SIZE } from '#lib/helpers/resolutionUpload';
import { m } from '#lib/paraglide/messages';
import { filePurpose } from './storageClient';

/**
 * Every file the app stores, by the kind of row and the field it belongs to.
 *
 * The bytes live in the S3 bucket. A row holds the id of a `stored_file` (`column`). Uploads go
 * straight from the browser to the bucket through a presigned URL (`requestFileUpload`), and the
 * mutation saving the row then claims the file (`assertCanClaimFile`, then
 * `ensureUploadComplete`). Downloads come straight from the bucket too: readers select the row's
 * file relation (`conference.logoFile { url }`), whose `url` is a presigned URL; a reader whose
 * column mask hides the file id gets no file.
 *
 * The team `permission` (`rolesWithTeamPermission`) uploads the file (a system admin always may),
 * `mimeTypes` and `maxBytes` limit what they upload.
 */
interface FileSource {
	column: string;
	mimeTypes: readonly string[];
	maxBytes: number;
	permission: TeamPermission;
}

const PDF = ['application/pdf'];
const IMAGES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

/** The conference's pictures, public wherever the conference is. */
const conferenceImage = (column: string): FileSource => ({
	column,
	mimeTypes: IMAGES,
	maxBytes: 1_000_000,
	permission: 'manageConference'
});

/** The PDF templates the participants' documents are printed on, for members only. */
const conferenceTemplate = (column: string): FileSource => ({
	column,
	mimeTypes: PDF,
	maxBytes: 10_000_000,
	permission: 'editConferenceContent'
});

const FILE_SOURCES = {
	conference: {
		image: conferenceImage('imageFileId'),
		emblem: conferenceImage('emblemFileId'),
		logo: conferenceImage('logoFileId'),
		contract: conferenceTemplate('contractFileId'),
		guardianConsent: conferenceTemplate('guardianConsentFileId'),
		mediaConsent: conferenceTemplate('mediaConsentFileId'),
		termsAndConditions: conferenceTemplate('termsAndConditionsFileId'),
		certificate: conferenceTemplate('certificateFileId')
	},
	place: {
		sitePlan: {
			column: 'sitePlanFileId',
			mimeTypes: PDF,
			maxBytes: 10_000_000,
			permission: 'manageParticipants'
		}
	},
	resolution: {
		content: {
			column: 'fileId',
			mimeTypes: PDF,
			maxBytes: MAX_RESOLUTION_FILE_SIZE,
			permission: 'editConferenceContent'
		}
	}
} as const satisfies Record<string, Record<string, FileSource>>;

export type FileKind = keyof typeof FILE_SOURCES;
export type FileField<K extends FileKind> = keyof (typeof FILE_SOURCES)[K] & string;

function isFileKind(kind: string): kind is FileKind {
	return Object.hasOwn(FILE_SOURCES, kind);
}

/** What a kind and field name, or `undefined` when they are not a stored file. */
export function findFileSource({ kind, field }: { kind: string; field: string }) {
	if (!isFileKind(kind)) return undefined;
	const fields: Record<string, FileSource> = FILE_SOURCES[kind];
	if (!Object.hasOwn(fields, field)) return undefined;
	return { kind, field, purpose: filePurpose({ kind, field }), ...fields[field] };
}

/**
 * The arguments of `requestFileUpload`, checked against the field's entry in `FILE_SOURCES` (a
 * field that takes no file, a type it does not allow, an empty or too large file are refused) and
 * turned into that entry and the file to record.
 */
export const uploadArgsSchema = z
	.object({
		conferenceId: z.string(),
		kind: z.string(),
		field: z.string(),
		fileName: z.string(),
		mimeType: z.string(),
		size: z.number().int()
	})
	.transform(({ conferenceId, kind, field, fileName, mimeType, size }, ctx) => {
		const source = findFileSource({ kind, field });
		if (!source) {
			ctx.addIssue({ code: 'custom', message: m.fileUploadUnknownPurpose() });
			return z.NEVER;
		}
		const refusal = uploadRefusal({ source, mimeType, size });
		if (refusal) {
			ctx.addIssue({ code: 'custom', message: refusal });
			return z.NEVER;
		}
		return {
			conferenceId,
			source,
			file: { fileName: fileName.trim() || null, mimeType, size }
		};
	});

export type UploadRequest = z.output<typeof uploadArgsSchema>;

/** Why the field does not take a file of this type and size, or undefined when it does. */
function uploadRefusal({
	source,
	mimeType,
	size
}: {
	source: FileSource;
	mimeType: string;
	size: number;
}) {
	if (!source.mimeTypes.includes(mimeType)) return m.fileUploadTypeNotAllowed();
	if (size <= 0) return m.fileUploadEmpty();
	if (size > source.maxBytes) return m.fileTooLarge({ max: formatMegabytes(source.maxBytes) });
	return undefined;
}

/** "10 MB", for the size limit in an error message. */
export function formatMegabytes(bytes: number) {
	return `${Math.round(bytes / 100_000) / 10} MB`;
}
