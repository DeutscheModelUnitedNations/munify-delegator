import { db, type Transaction, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { calendarDayPubsub, calendarEntryPubsub, calendarTrackPubsub } from '#api/pubsub';

/** Makes `ids` the rows `table` links the track (`a`) to. */
async function setLinks({
	tx,
	table,
	trackId,
	ids
}: {
	tx: Transaction;
	table: typeof schema.calendarTrackToCommittee | typeof schema.calendarTrackToConferenceRole;
	trackId: string;
	ids: readonly string[];
}) {
	await tx.delete(table).where(whereRows({ table, filter: { a: trackId } }));
	const distinct = [...new Set(ids)];
	if (distinct.length > 0) {
		await tx.insert(table).values(distinct.map((id) => ({ a: trackId, b: id })));
	}
}

/** Who a track is for: given lists replace the committees and roles, left out keeps them. */
interface Seats {
	committeeIds?: readonly string[] | null;
	conferenceRoleIds?: readonly string[] | null;
}

async function setSeats({
	tx,
	trackId,
	seats
}: {
	tx: Transaction;
	trackId: string;
	seats: Seats;
}) {
	if (seats.committeeIds) {
		await setLinks({
			tx,
			table: schema.calendarTrackToCommittee,
			trackId,
			ids: seats.committeeIds
		});
	}
	if (seats.conferenceRoleIds) {
		await setLinks({
			tx,
			table: schema.calendarTrackToConferenceRole,
			trackId,
			ids: seats.conferenceRoleIds
		});
	}
}

/** Creates a track on the given days, for the given committees and roles. */
export async function createCalendarTrack({
	values,
	calendarDayIds,
	seats
}: {
	values: typeof schema.calendarTrack.$inferInsert;
	calendarDayIds: readonly string[];
	seats: Seats;
}) {
	const dayIds = [...new Set(calendarDayIds)];
	const created = await db.transaction(async (tx) => {
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
		await setSeats({ tx, trackId: created.id, seats });
		return created;
	});
	calendarTrackPubsub.created();
	if (dayIds.length > 0) calendarDayPubsub.updated(dayIds);
	return created;
}

/** Changes the given fields of a track and, when given, whom it is for. */
export async function updateCalendarTrack({
	id,
	values,
	seats
}: {
	id: string;
	values: Partial<typeof schema.calendarTrack.$inferInsert>;
	seats: Seats;
}) {
	await db.transaction(async (tx) => {
		if (Object.values(values).some((value) => value !== undefined)) {
			await tx
				.update(schema.calendarTrack)
				.set(values)
				.where(whereRows({ table: schema.calendarTrack, filter: { id } }));
		}
		await setSeats({ tx, trackId: id, seats });
	});
	calendarTrackPubsub.updated(id);
}

/**
 * Takes the track off the entries of `entries` and deletes those left on no track: every entry
 * runs on at least one. Returns the ids of the entries that stay and of the deleted ones.
 */
async function detachEntries({
	tx,
	trackId,
	entries
}: {
	tx: Transaction;
	trackId: string;
	entries: { id: string; tracks: { id: string }[] }[];
}) {
	const deleted = entries.filter((entry) => entry.tracks.every((t) => t.id === trackId));
	const kept = entries.filter((entry) => !deleted.includes(entry));
	if (kept.length > 0) {
		await tx.delete(schema.calendarEntryToCalendarTrack).where(
			whereRows({
				table: schema.calendarEntryToCalendarTrack,
				filter: { b: trackId, a: { in: kept.map((entry) => entry.id) } }
			})
		);
	}
	if (deleted.length > 0) {
		await tx.delete(schema.calendarEntry).where(
			whereRows({
				table: schema.calendarEntry,
				filter: { id: { in: deleted.map((entry) => entry.id) } }
			})
		);
	}
	return { keptIds: kept.map((entry) => entry.id), deletedIds: deleted.map((entry) => entry.id) };
}

/** The entries on a track, those of one day only when `calendarDayId` is given. */
function entriesOnTrack({
	tx,
	trackId,
	calendarDayId
}: {
	tx: Transaction;
	trackId: string;
	calendarDayId?: string;
}) {
	return tx.query.calendarEntry.findMany({
		where: { tracks: { id: trackId }, ...(calendarDayId && { calendarDayId }) },
		columns: { id: true },
		with: { tracks: { columns: { id: true } } }
	});
}

function announceEntries({ keptIds, deletedIds }: { keptIds: string[]; deletedIds: string[] }) {
	if (keptIds.length > 0) calendarEntryPubsub.updated(keptIds);
	if (deletedIds.length > 0) calendarEntryPubsub.removed();
}

/** Deletes a track; entries that ran on it alone go with it, entries on others stay. */
export async function deleteCalendarTrack(id: string) {
	const { dayIds, ...entries } = await db.transaction(async (tx) => {
		const days = await tx.query.calendarDayToCalendarTrack.findMany({
			where: { b: id },
			columns: { a: true }
		});
		const entries = await detachEntries({
			tx,
			trackId: id,
			entries: await entriesOnTrack({ tx, trackId: id })
		});
		await tx
			.delete(schema.calendarTrack)
			.where(whereRows({ table: schema.calendarTrack, filter: { id } }));
		return { dayIds: days.map((day) => day.a), ...entries };
	});
	calendarTrackPubsub.removed();
	if (dayIds.length > 0) calendarDayPubsub.updated(dayIds);
	announceEntries(entries);
}

/**
 * Lets a track run on a day, or takes it off the day: the day's entries leave the track, and
 * those on no other track go.
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
	const entries = await db.transaction(async (tx) => {
		if (runs) {
			await tx
				.insert(schema.calendarDayToCalendarTrack)
				.values({ a: calendarDayId, b: trackId })
				.onConflictDoNothing();
			return { keptIds: [], deletedIds: [] };
		}
		const entries = await detachEntries({
			tx,
			trackId,
			entries: await entriesOnTrack({ tx, trackId, calendarDayId })
		});
		await tx.delete(schema.calendarDayToCalendarTrack).where(
			whereRows({
				table: schema.calendarDayToCalendarTrack,
				filter: { a: calendarDayId, b: trackId }
			})
		);
		return entries;
	});
	calendarDayPubsub.updated(calendarDayId);
	calendarTrackPubsub.updated(trackId);
	announceEntries(entries);
}
