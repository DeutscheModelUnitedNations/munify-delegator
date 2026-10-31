import { db, type Transaction, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { replaceLinks } from '#api/db/replaceLinks';
import { calendarDayPubsub, calendarEntryPubsub, calendarTrackPubsub } from '#api/pubsub';
import { apiError, isUniqueViolationOn } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/** Turns the unique index on the conference's track names into CONFLICT. */
async function refusingTakenName<T>(write: Promise<T>) {
	try {
		return await write;
	} catch (error) {
		if (isUniqueViolationOn({ error, column: 'name' })) {
			throw apiError({ code: 'CONFLICT', message: m.calendarTrackNameTaken() });
		}
		throw error;
	}
}

/**
 * Who a track is for. Each list replaces its links whole: `[]` clears them, left out or `null`
 * keeps them.
 */
interface TrackAudience {
	committeeIds?: readonly string[] | null;
	conferenceRoleIds?: readonly string[] | null;
}

/** Replaces whom the track is for: each given list, a left out one stays. */
async function setAudience({
	tx,
	trackId,
	audience
}: {
	tx: Transaction;
	trackId: string;
	audience: TrackAudience;
}) {
	if (audience.committeeIds) {
		await replaceLinks({
			tx,
			table: schema.calendarTrackToCommittee,
			aId: trackId,
			bIds: audience.committeeIds
		});
	}
	if (audience.conferenceRoleIds) {
		await replaceLinks({
			tx,
			table: schema.calendarTrackToConferenceRole,
			aId: trackId,
			bIds: audience.conferenceRoleIds
		});
	}
}

/**
 * Creates a track on the given days, for the given committees and roles; a name another track of
 * the conference has is refused (CONFLICT). Returns its id.
 */
export async function createCalendarTrack({
	values,
	calendarDayIds,
	audience
}: {
	values: typeof schema.calendarTrack.$inferInsert;
	calendarDayIds: readonly string[];
	audience: TrackAudience;
}) {
	const dayIds = [...new Set(calendarDayIds)];
	const created = await refusingTakenName(
		db.transaction(async (tx) => {
			const created = await tx
				.insert(schema.calendarTrack)
				.values(values)
				.returning({ id: schema.calendarTrack.id })
				.then(assertFirstEntryExists);
			if (dayIds.length > 0) {
				await tx
					.insert(schema.calendarDayToCalendarTrack)
					.values(dayIds.map((dayId) => ({ a: dayId, b: created.id })));
			}
			await setAudience({ tx, trackId: created.id, audience });
			return created;
		})
	);
	calendarTrackPubsub.created();
	if (dayIds.length > 0) calendarDayPubsub.updated(dayIds);
	return created.id;
}

/**
 * Changes the given fields of a track and, when given, whom it is for; a name another track of the
 * conference has is refused (CONFLICT).
 */
export async function updateCalendarTrack({
	id,
	values,
	audience
}: {
	id: string;
	values: Partial<typeof schema.calendarTrack.$inferInsert>;
	audience: TrackAudience;
}) {
	await refusingTakenName(
		db.transaction(async (tx) => {
			if (Object.values(values).some((value) => value !== undefined)) {
				await tx
					.update(schema.calendarTrack)
					.set(values)
					.where(whereRows({ table: schema.calendarTrack, filter: { id } }));
			}
			await setAudience({ tx, trackId: id, audience });
		})
	);
	calendarTrackPubsub.updated(id);
}

interface EntryOnTrack {
	id: string;
	/** Every track the entry runs on, this one included. */
	tracks: { id: string }[];
}

/** Ids of the entries a track change kept (now on fewer tracks) and deleted. */
interface ChangedEntries {
	keptIds: string[];
	deletedIds: string[];
}

/** The entries on a track, only those on `calendarDayId` when given. */
function findEntriesOnTrack({
	tx,
	trackId,
	calendarDayId
}: {
	tx: Transaction;
	trackId: string;
	calendarDayId?: string;
}): Promise<EntryOnTrack[]> {
	return tx.query.calendarEntry.findMany({
		where: { tracks: { id: trackId }, ...(calendarDayId && { calendarDayId }) },
		columns: { id: true },
		with: { tracks: { columns: { id: true } } }
	});
}

/**
 * Takes `entries` off the track. An entry must run on some track, so those on this track alone
 * are deleted instead.
 */
async function takeEntriesOffTrack({
	tx,
	trackId,
	entries
}: {
	tx: Transaction;
	trackId: string;
	entries: EntryOnTrack[];
}): Promise<ChangedEntries> {
	const onThisTrackOnly = entries.filter((entry) => entry.tracks.every((t) => t.id === trackId));
	const onOtherTracksToo = entries.filter((entry) => !onThisTrackOnly.includes(entry));
	const keptIds = onOtherTracksToo.map((entry) => entry.id);
	const deletedIds = onThisTrackOnly.map((entry) => entry.id);
	if (keptIds.length > 0) {
		await tx.delete(schema.calendarEntryToCalendarTrack).where(
			whereRows({
				table: schema.calendarEntryToCalendarTrack,
				filter: { b: trackId, a: { in: keptIds } }
			})
		);
	}
	if (deletedIds.length > 0) {
		await tx
			.delete(schema.calendarEntry)
			.where(whereRows({ table: schema.calendarEntry, filter: { id: { in: deletedIds } } }));
	}
	return { keptIds, deletedIds };
}

/** Announces the entries `detachEntries` changed, once its transaction has committed. */
function publishChangedEntries({ keptIds, deletedIds }: ChangedEntries) {
	if (keptIds.length > 0) calendarEntryPubsub.updated(keptIds);
	if (deletedIds.length > 0) calendarEntryPubsub.removed();
}

/** Deletes a track; entries that ran on it alone go with it, entries on other tracks stay. */
export async function deleteCalendarTrack(id: string) {
	const { dayIds, ...changedEntries } = await db.transaction(async (tx) => {
		const dayLinks = await tx.query.calendarDayToCalendarTrack.findMany({
			where: { b: id },
			columns: { a: true }
		});
		const changedEntries = await takeEntriesOffTrack({
			tx,
			trackId: id,
			entries: await findEntriesOnTrack({ tx, trackId: id })
		});
		await tx
			.delete(schema.calendarTrack)
			.where(whereRows({ table: schema.calendarTrack, filter: { id } }));
		return { dayIds: dayLinks.map((link) => link.a), ...changedEntries };
	});
	calendarTrackPubsub.removed();
	if (dayIds.length > 0) calendarDayPubsub.updated(dayIds);
	publishChangedEntries(changedEntries);
}

/**
 * Lets a track run on a day (`runs`), or takes it off the day, along with that day's entries as
 * `takeEntriesOffTrack` does.
 */
export async function setCalendarTrackOnDay({
	trackId,
	calendarDayId,
	runs
}: {
	trackId: string;
	calendarDayId: string;
	runs: boolean;
}) {
	const changedEntries = await db.transaction(async (tx): Promise<ChangedEntries> => {
		if (runs) {
			await tx
				.insert(schema.calendarDayToCalendarTrack)
				.values({ a: calendarDayId, b: trackId })
				.onConflictDoNothing();
			return { keptIds: [], deletedIds: [] };
		}
		const changedEntries = await takeEntriesOffTrack({
			tx,
			trackId,
			entries: await findEntriesOnTrack({ tx, trackId, calendarDayId })
		});
		await tx.delete(schema.calendarDayToCalendarTrack).where(
			whereRows({
				table: schema.calendarDayToCalendarTrack,
				filter: { a: calendarDayId, b: trackId }
			})
		);
		return changedEntries;
	});
	calendarDayPubsub.updated(calendarDayId);
	calendarTrackPubsub.updated(trackId);
	publishChangedEntries(changedEntries);
}
