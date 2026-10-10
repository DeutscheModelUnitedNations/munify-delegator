import { client } from '$lib/api/rumbleClient/client';
import type { TableState } from '$lib/components/tanStackTable/tableState.svelte';
import { BACKEND_PAGE_LIMIT } from '$lib/components/tanStackTable/serverQuery';
import { fetchConferenceParticipants } from './conferenceParticipants';
import { toFilterInputs, type FilterKind } from './filterInputs';
import { transformParticipants } from './dataTransform';
import type { ParticipantRow } from './types';

export type { FilterKind } from './filterInputs';

interface Source {
	conferenceId: string;
	state: TableState;
	kinds: ReadonlyMap<string, FilterKind>;
}

async function fetchIds({ conferenceId, state, kinds }: Source, limit: number, offset: number) {
	return client.query.participantsPage({
		__args: {
			conferenceId,
			search: state.search,
			filters: toFilterInputs(state.columnFilters, kinds),
			sort: state.sorting.map(({ id, desc }) => ({ column: id, desc })),
			limit,
			offset
		},
		userIds: true,
		hasMore: true,
		total: true
	});
}

/** The rows for the users given, in their order. */
async function rowsFor(conferenceId: string, userIds: string[]): Promise<ParticipantRow[]> {
	if (userIds.length === 0) return [];
	const registrations = await fetchConferenceParticipants(conferenceId, userIds);
	const { conference } = registrations;
	const rows = transformParticipants(
		registrations,
		conference?.startConference,
		conference?.endConference
	);
	const position = new Map(userIds.map((id, index) => [id, index]));
	return rows.sort((a, b) => (position.get(a.userId) ?? 0) - (position.get(b.userId) ?? 0));
}

/** One page of the participants table: the backend picks and orders the people, then they are read. */
export async function fetchParticipantsPage(source: Source) {
	const { pageIndex, pageSize } = source.state.pagination;
	const page = await fetchIds(source, pageSize, pageIndex * pageSize);
	const rows = await rowsFor(source.conferenceId, page.userIds);
	return { rows, hasMore: page.hasMore, total: page.total };
}

/** Every participant matching the table's search and filters, for the export. */
export async function fetchAllParticipants(source: Source): Promise<ParticipantRow[]> {
	const all: ParticipantRow[] = [];
	for (let offset = 0; ; offset += BACKEND_PAGE_LIMIT) {
		const page = await fetchIds(source, BACKEND_PAGE_LIMIT, offset);
		// 500 people per detail query keeps the `in` list and the response a sane size
		for (let start = 0; start < page.userIds.length; start += 500) {
			all.push(...(await rowsFor(source.conferenceId, page.userIds.slice(start, start + 500))));
		}
		if (!page.hasMore) return all;
	}
}
