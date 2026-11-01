import { db, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { resolutionPubsub } from '#api/pubsub';
import { ensureUploadComplete } from '#api/handlers/storedFile/storedFileService';

/** A title as stored, trimmed; a blank one is none (the file's name, or the old title, stays). */
function givenTitle(title: string | null | undefined) {
	return title?.trim() || undefined;
}

/**
 * Adds an adopted resolution with its PDF, unless the upload has not arrived in full (CONFLICT).
 * Without a title it is named like the uploaded file. Returns its id.
 */
export async function createResolution({
	conferenceId,
	committeeId,
	title,
	fileId
}: {
	conferenceId: string;
	committeeId: string | null | undefined;
	title: string | null | undefined;
	fileId: string;
}) {
	// Its type and size were checked when the upload was handed out.
	await ensureUploadComplete(fileId);
	const file = await db.query.storedFile.findFirst({
		where: { id: fileId },
		columns: { fileName: true }
	});

	const { id } = await db
		.insert(schema.resolution)
		.values({
			conferenceId,
			committeeId: committeeId ?? undefined,
			title: givenTitle(title) ?? file?.fileName ?? m.resolution(),
			fileId
		})
		.returning({ id: schema.resolution.id })
		.then(assertFirstEntryExists);
	resolutionPubsub.created();
	return id;
}

/**
 * Changes a resolution's title or committee tag. A title left out keeps the old one; a committee
 * left out keeps the tag, `null` removes it.
 */
export async function updateResolution({
	id,
	changes
}: {
	id: string;
	changes: { title: string | null | undefined; committeeId: string | null | undefined };
}) {
	await db
		.update(schema.resolution)
		.set({
			title: givenTitle(changes.title),
			committeeId: changes.committeeId,
			updatedAt: new Date()
		})
		.where(whereRows({ table: schema.resolution, filter: { id } }));
	resolutionPubsub.updated(id);
}
