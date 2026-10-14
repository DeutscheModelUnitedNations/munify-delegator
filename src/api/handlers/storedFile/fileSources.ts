import {
	CONFERENCE_CONTENT_ROLES,
	PARTICIPANT_CARE_ROLES,
	PROJECT_MANAGEMENT_ROLES
} from '$lib/helpers/teamRoles';
import { MAX_RESOLUTION_FILE_SIZE } from '$lib/helpers/resolutionUpload';
import type { TeamroleEnum } from '$lib/api/rumbleClient/client';
import { filePurpose } from './storageClient';

/**
 * Every file the app stores, by the kind of row and the field it belongs to.
 *
 * The bytes live in the S3 bucket. A row holds the id of a `stored_file` (`column`). Uploads go
 * straight from the browser to the bucket through a presigned URL (`requestFileUpload`), and the
 * mutation saving the row then claims the file (`assertCanClaimFile`, then `ensureUploadComplete`). Downloads come straight
 * from the bucket too: the row's `*Url` field is a presigned URL (`fileUrl`), null for a reader
 * whose column mask hides the file.
 *
 * `roles` may upload the file (a system admin always may), `mimeTypes` and `maxBytes` limit what
 * they upload.
 */
interface FileSource {
	column: string;
	mimeTypes: readonly string[];
	maxBytes: number;
	roles: readonly TeamroleEnum[];
}

const PDF = ['application/pdf'];
const IMAGES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

/** The conference's pictures, public wherever the conference is. */
const conferenceImage = (column: string): FileSource => ({
	column,
	mimeTypes: IMAGES,
	maxBytes: 1_000_000,
	roles: PROJECT_MANAGEMENT_ROLES
});

/** The PDF templates the participants' documents are printed on, for members only. */
const conferenceTemplate = (column: string): FileSource => ({
	column,
	mimeTypes: PDF,
	maxBytes: 10_000_000,
	roles: CONFERENCE_CONTENT_ROLES
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
			roles: PARTICIPANT_CARE_ROLES
		}
	},
	resolution: {
		content: {
			column: 'fileId',
			mimeTypes: PDF,
			maxBytes: MAX_RESOLUTION_FILE_SIZE,
			roles: CONFERENCE_CONTENT_ROLES
		}
	}
} as const satisfies Record<string, Record<string, FileSource>>;

export type FileKind = keyof typeof FILE_SOURCES;
export type FileField<K extends FileKind> = keyof (typeof FILE_SOURCES)[K] & string;

function isFileKind(kind: string): kind is FileKind {
	return Object.hasOwn(FILE_SOURCES, kind);
}

/** What a kind and field name, or `undefined` when they are not a stored file. */
export function findFileSource(kind: string, field: string) {
	if (!isFileKind(kind)) return undefined;
	const fields: Record<string, FileSource> = FILE_SOURCES[kind];
	if (!Object.hasOwn(fields, field)) return undefined;
	return { kind, field, purpose: filePurpose(kind, field), ...fields[field] };
}

/** "10 MB", for the size limit in an error message. */
export function formatMegabytes(bytes: number) {
	return `${Math.round(bytes / 100_000) / 10} MB`;
}
