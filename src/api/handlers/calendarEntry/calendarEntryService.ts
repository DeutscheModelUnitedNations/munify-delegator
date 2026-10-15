import { type Transaction, db, schema } from '$api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';

/** Makes `trackIds` the tracks of an entry. */
async function setTracks(tx: Transaction, entryId: string, trackIds: readonly string[]) {
	const ids = [...new Set(trackIds)];
	await tx
		.delete(schema.calendarEntryToCalendarTrack)
		.where(eq(schema.calendarEntryToCalendarTrack.a, entryId));
	if (ids.length > 0) {
		await tx
			.insert(schema.calendarEntryToCalendarTrack)
			.values(ids.map((trackId) => ({ a: entryId, b: trackId })));
	}
}

/** Creates an entry together with its tracks, so it never exists without them. */
export async function createCalendarEntry(
	values: typeof schema.calendarEntry.$inferInsert,
	trackIds: readonly string[] | null | undefined
) {
	return db.transaction(async (tx) => {
		const created = await tx
			.insert(schema.calendarEntry)
			.values(values)
			.returning()
			.then(assertFirstEntryExists);
		if (trackIds?.length) await setTracks(tx, created.id, trackIds);
		return created;
	});
}

/** Changes an entry and, when `trackIds` is given, replaces its tracks in the same step. */
export async function updateCalendarEntry(
	id: string,
	values: Partial<typeof schema.calendarEntry.$inferInsert>,
	trackIds: readonly string[] | null | undefined
) {
	await db.transaction(async (tx) => {
		await tx.update(schema.calendarEntry).set(values).where(eq(schema.calendarEntry.id, id));
		if (trackIds) await setTracks(tx, id, trackIds);
	});
}
