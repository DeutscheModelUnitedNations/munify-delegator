import { apiError } from '$api/services/errors/apiError';
import { db } from '$api/db/db';
import type { Context } from '$api/context';
import { abilityBuilder } from '$api/rumble';
import { assertTeamRole, systemAdmin, userId } from '$api/services/authHelper';
import { m } from '$lib/paraglide/messages';
import { findFileSource, type FileField, type FileKind } from './fileSources';

// A stored file is reached through the relation of the row holding it (`conference.logoFile`,
// `resolution.file`, …) or as the answer to `requestFileUpload`; there is no query listing files.
// Who may see a file is therefore the holding row's business: a relation behind a masked id
// (`contractFileId` for a reader outside the conference) resolves to nothing. The file itself is
// readable by anyone who reaches it; only who uploaded it stays with the uploader.
//
// TODO(security): review these rules with extra care before release. Everything rests on two
// assumptions that nothing here enforces: that no `query({ table: 'storedFile' })`, search or other
// path lists files, and that every private file's id column is masked on its holding row (today
// the conference templates' `*FileId`). A new relation to `storedFile`, a new file field or an
// unmasked id hands out the file - and a URL, which works for hours - to anyone who reads the row.
// Consider scoping the base rule (by conference, or to rows the reader can see) instead of
// allowing every read.
abilityBuilder.storedFile.allow('read').when(() => ({ columns: { uploadedById: false } }));
abilityBuilder.storedFile.allow('read').when(systemAdmin);
abilityBuilder.storedFile.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { uploadedById: id } } : undefined;
});

// Who may upload a file is part of its entry in `FILE_SOURCES`, and who may use an uploaded one
// is checked here.

/**
 * Refuses unless the caller may upload the file `field` of a `kind` row of `conferenceId`, which
 * the field's entry in `FILE_SOURCES` decides. Returns that entry.
 */
export async function assertCanUploadFile(
	ctx: Context,
	target: { kind: string; field: string; conferenceId: string }
) {
	ctx.mustBeLoggedIn();
	const source = findFileSource(target.kind, target.field);
	if (!source) throw apiError('INVALID_INPUT', m.fileUploadUnknownPurpose());
	await assertTeamRole(ctx, target.conferenceId, source.roles);
	return source;
}

/**
 * Refuses unless the caller may store `fileId` in `field` of a `kind` row of `conferenceId`: they
 * uploaded it, for exactly that. Passes `null` (clear the field) and `undefined` (leave it alone)
 * through, so it wraps a mutation argument as it is.
 *
 * The caller's right to write the row itself is the mutation's business, as for any other column;
 * that the file arrived in full is `ensureUploadComplete`'s.
 */
export async function assertCanClaimFile<K extends FileKind>(
	ctx: Context,
	fileId: string | null | undefined,
	target: { kind: K; field: FileField<K>; conferenceId: string }
) {
	if (fileId === null || fileId === undefined) return;
	const user = ctx.mustBeLoggedIn();
	const source = findFileSource(target.kind, target.field);

	const file = await db.query.storedFile.findFirst({
		where: { id: fileId },
		columns: { purpose: true, conferenceId: true, uploadedById: true }
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
}
