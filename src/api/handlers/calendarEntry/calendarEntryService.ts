import { db, schema } from '$api/db/db';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

/**
 * An entry's day, track and place are ids from the client, so each has to belong where the entry
 * does: the track to the entry's day, the place and the day to the entry's conference. Otherwise a
 * conference's calendar could pull in another conference's venues, or move entries over to it.
 */
export async function assertReferences(
	conferenceId: string,
	refs: { calendarDayId: string; calendarTrackIds?: readonly string[]; placeId?: string | null }
) {
	const trackIds = [...new Set(refs.calendarTrackIds ?? [])];
	if (refs.calendarTrackIds && trackIds.length === 0) {
		throw new GraphQLError('An entry has to run on at least one track');
	}
	const [day, tracks, place] = await Promise.all([
		db.query.calendarDay.findFirst({
			where: { id: refs.calendarDayId, conferenceId },
			columns: { id: true }
		}),
		trackIds.length > 0
			? db.query.calendarTrack.findMany({
					where: { id: { in: trackIds }, calendarDayId: refs.calendarDayId },
					columns: { id: true }
				})
			: [],
		refs.placeId
			? db.query.place.findFirst({
					where: { id: refs.placeId, conferenceId },
					columns: { id: true }
				})
			: true
	]);
	if (!day || tracks.length !== trackIds.length || !place) {
		throw new GraphQLError('Day, track and place must all belong to the same conference');
	}
}

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
