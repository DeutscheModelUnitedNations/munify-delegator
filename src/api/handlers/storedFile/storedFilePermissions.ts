import { apiError } from '#api/services/errors/apiError';
import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	anyOf,
	assertTeamPermission,
	calendarConference,
	conferencesOfCaller,
	readableConference,
	systemAdmin,
	userId
} from '#api/services/authHelper';
import { m } from '#lib/paraglide/messages';
import { findFileSource, type FileField, type FileKind } from './fileSources';
import { objectKey } from './storageClient';

/** Who uploaded a file is the uploader's (and an admin's) to know. */
const WITHOUT_UPLOADER = { uploadedById: false };

/**
 * Who may read a stored file - and so get its presigned URL, the only way to its bytes - follows
 * the row that holds it, through the relations from the file to its holders (`relations.ts`):
 * whoever may read that row's file reads the file. A file nothing holds is its uploader's alone.
 * These mirror the holding rows' rules; a new file field needs its relation and a rule here, or
 * nobody but its uploader can read the file.
 *
 * - a conference's image, emblem and logo: wherever the conference may be read (public while it
 *   takes registrations, otherwise to the people with a part in it);
 * - its templates (contract, consents, terms, certificate): to the people with a part in it, like
 *   the members-only columns that hold them;
 * - a place's site plan: to whoever reads the conference's calendar, like the place;
 * - a resolution's PDF: to the people with a part in its conference, like the resolution.
 */
export function registerStoredFileAbilities() {
	abilityBuilder.storedFile.allow('read').when(systemAdmin);

	abilityBuilder.storedFile.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { uploadedById: id } } : undefined;
	});

	abilityBuilder.storedFile.allow('read').when((ctx) => {
		const conference = readableConference(ctx);
		return {
			where: {
				OR: [{ imageOf: conference }, { emblemOf: conference }, { logoOf: conference }]
			},
			columns: WITHOUT_UPLOADER
		};
	});

	abilityBuilder.storedFile.allow('read').when((ctx) => {
		const conference = anyOf(conferencesOfCaller(ctx));
		return conference
			? {
					where: {
						OR: [
							{ contractOf: conference },
							{ guardianConsentOf: conference },
							{ mediaConsentOf: conference },
							{ termsAndConditionsOf: conference },
							{ certificateOf: conference }
						]
					},
					columns: WITHOUT_UPLOADER
				}
			: undefined;
	});

	abilityBuilder.storedFile.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference
			? { where: { sitePlanOf: { conference } }, columns: WITHOUT_UPLOADER }
			: undefined;
	});

	abilityBuilder.storedFile.allow('read').when((ctx) => {
		const conference = anyOf(conferencesOfCaller(ctx));
		return conference
			? { where: { resolutionOf: { conference } }, columns: WITHOUT_UPLOADER }
			: undefined;
	});
}

// Who may upload a file is part of its entry in `FILE_SOURCES`, and who may use an uploaded one
// is checked here.

/**
 * Refuses unless the caller may upload the file `field` of a `kind` row of `conferenceId`, which
 * the field's entry in `FILE_SOURCES` decides. Returns that entry.
 */
export async function assertCanUploadFile(
	ctx: ApiContext,
	target: { kind: string; field: string; conferenceId: string }
) {
	ctx.mustBeLoggedIn();
	const source = findFileSource(target.kind, target.field);
	if (!source) throw apiError('INVALID_INPUT', m.fileUploadUnknownPurpose());
	await assertTeamPermission(ctx, target.conferenceId, source.permission);
	return source;
}

/**
 * Refuses unless the caller may store `fileId` in `field` of a `kind` row of `conferenceId`: they
 * uploaded it, for that field of that conference. A file names no conference, but the key
 * `requestFileUpload` gave it does (`objectKey`). Passes `null` (clear the field) and `undefined`
 * (leave it alone) through, so it wraps a mutation argument as it is.
 *
 * The caller's right to write the row itself is the mutation's business, as for any other column;
 * that the file arrived in full is `ensureUploadComplete`'s.
 */
export async function assertCanClaimFile<K extends FileKind>(
	ctx: ApiContext,
	fileId: string | null | undefined,
	target: { kind: K; field: FileField<K>; conferenceId: string }
) {
	if (fileId === null || fileId === undefined) return;
	const user = ctx.mustBeLoggedIn();
	const source = findFileSource(target.kind, target.field);

	const file = await db.query.storedFile.findFirst({
		where: { id: fileId },
		columns: { key: true, purpose: true, uploadedById: true }
	});
	if (
		!source ||
		!file ||
		file.purpose !== source.purpose ||
		file.uploadedById !== user.sub ||
		!file.key.startsWith(objectKey(target.conferenceId, source.purpose, ''))
	) {
		throw apiError('INVALID_INPUT', m.fileUploadNotUsable());
	}
}
