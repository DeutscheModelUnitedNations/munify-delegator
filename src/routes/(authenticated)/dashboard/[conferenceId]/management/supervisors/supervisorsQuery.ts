import { client } from '$lib/api/rumbleClient/client';
import type {
	ConferencesupervisorOrderInputArgument,
	ConferencesupervisorWhereInputArgument
} from '$lib/api/rumbleClient/client';
import type { TableState } from '$lib/components/tanStackTable/tableState.svelte';
import {
	allOf,
	asCount,
	booleanFilter,
	fetchEveryRow,
	orderFrom,
	pageArgs,
	pageOf,
	personContains,
	searchWords
} from '$lib/components/tanStackTable/serverQuery';

function whereOf(conferenceId: string, state: TableState): ConferencesupervisorWhereInputArgument {
	const plans = booleanFilter(
		state.columnFilters.find((filter) => filter.id === 'plansAttendance')?.value
	);
	return {
		conferenceId: { eq: conferenceId },
		...(plans === undefined ? {} : { plansOwnAttendenceAtConference: { eq: plans } }),
		...allOf(searchWords(state.search).map((word) => ({ user: personContains(word) })))
	};
}

function listSupervisors(
	conferenceId: string,
	state: TableState,
	paging: { limit: number; offset: number }
) {
	return client.liveQuery.conferenceSupervisors({
		__args: {
			where: whereOf(conferenceId, state),
			orderBy: orderFrom<ConferencesupervisorOrderInputArgument>(
				state.sorting,
				{
					plansAttendance: (direction) => ({ plansOwnAttendenceAtConference: direction })
				},
				{ createdAt: 'desc', id: 'asc' }
			),
			...paging
		},
		id: true,
		plansOwnAttendenceAtConference: true,
		user: { id: true, familyName: true, givenName: true },
		supervisedDelegationMembers: { id: true },
		supervisedSingleParticipants: { id: true }
	});
}

/** One page of a conference's supervisors, searched, filtered and ordered by the backend. */
export async function fetchSupervisorsPage(conferenceId: string, state: TableState) {
	const [supervisors, total] = await Promise.all([
		listSupervisors(conferenceId, state, pageArgs(state)),
		client.liveQuery.conferenceSupervisorsCount({ __args: { where: whereOf(conferenceId, state) } })
	]);
	return { ...pageOf(supervisors, state), total: asCount(total) };
}

/** Every supervisor matching the table's search and filters, for the export. */
export function fetchAllSupervisors(conferenceId: string, state: TableState) {
	return fetchEveryRow((paging) => listSupervisors(conferenceId, state, paging));
}
