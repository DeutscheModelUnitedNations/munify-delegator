import { db, schema } from '$api/db/db';
import { eq } from 'drizzle-orm';

/** Makes `trackIds` the tracks of an entry. */
export async function setTracks(entryId: string, trackIds: readonly string[]) {
	const ids = [...new Set(trackIds)];
	await db.transaction(async (tx) => {
		await tx
			.delete(schema.calendarEntryToCalendarTrack)
			.where(eq(schema.calendarEntryToCalendarTrack.a, entryId));
		if (ids.length > 0) {
			await tx
				.insert(schema.calendarEntryToCalendarTrack)
				.values(ids.map((trackId) => ({ a: entryId, b: trackId })));
		}
	});
}
