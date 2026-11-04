import { client } from '#lib/api/rumbleClient/client';
import { liveSnapshot } from '#lib/api/liveSnapshot';
import { createServerSource } from '#lib/components/dataGrid/serverSource';
import { toWaitingListRow, waitingListPositions, type WaitingListRow } from './waitingListRows';

/**
 * Each still waiting, visible entry's place on the list: first come, first served. Only the ids
 * are read, so this stays cheap however long the list is.
 */
function fetchWaitingListPositions(conferenceId: string) {
	return client.liveQuery.waitingListEntries({
		__args: {
			where: {
				conferenceId: { eq: conferenceId },
				assignedAt: { isNull: true },
				hidden: { eq: false }
			},
			orderBy: { createdAt: 'asc', id: 'asc' }
		},
		id: true
	});
}

const snapshotWaiting = liveSnapshot<{ id: string }>();

/**
 * The entries of the ids given, in that order, as table rows: fetched live, built by the reader
 * wherever it is called (in a `$derived`, where that is tracked).
 */
async function rowsFor({
	conferenceId,
	ids
}: {
	conferenceId: string;
	ids: string[];
}): Promise<() => WaitingListRow[]> {
	if (ids.length === 0) return () => [];
	const [conference, entries, waiting] = await Promise.all([
		client.liveQuery.conference({ __args: { id: conferenceId }, startConference: true }),
		client.liveQuery.waitingListEntries({
			__args: { where: { id: { in: ids } } },
			id: true,
			user: {
				id: true,
				givenName: true,
				familyName: true,
				email: true,
				phone: true,
				city: true,
				birthday: true,
				conferenceParticipationsCount: true
			},
			school: { name: true },
			experience: true,
			motivation: true,
			requests: true,
			hidden: true,
			assignedAt: true,
			createdAt: true
		}),
		fetchWaitingListPositions(conferenceId)
	]);
	return () => {
		const positions = waitingListPositions(snapshotWaiting(waiting));
		const byId = new Map(
			entries.map((entry) => [
				entry.id,
				toWaitingListRow({ entry, startConference: conference?.startConference, positions })
			])
		);
		return ids.flatMap((id): WaitingListRow[] => {
			const row = byId.get(id);
			return row ? [row] : [];
		});
	};
}

/** The conference's waiting list entries, as a text that changes when one is added or removed. */
async function entryChanges(conferenceId: string): Promise<() => string> {
	const entries = await client.liveQuery.waitingListEntries({
		// newest first: a list answers at most 1000 rows, and a new one has to be among them
		__args: {
			where: { conferenceId: { eq: conferenceId } },
			orderBy: { createdAt: 'desc', id: 'desc' }
		},
		id: true
	});
	// how many, and the newest: any row added or removed changes one of them
	return () => `${entries.length}:${entries[0]?.id ?? ''}`;
}

/** The waiting list's rows: the API's table engine picks and orders the entries. */
export function waitingListSource(conferenceId: string) {
	return createServerSource<WaitingListRow>({
		table: 'waitingList',
		conferenceId,
		rowsFor: ({ ids }) => rowsFor({ conferenceId, ids }),
		changes: () => entryChanges(conferenceId)
	});
}
