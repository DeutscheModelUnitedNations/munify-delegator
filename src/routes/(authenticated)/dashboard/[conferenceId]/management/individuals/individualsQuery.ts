import { client } from '$lib/api/rumbleClient/client';
import type {
	SingleparticipantOrderInputArgument,
	SingleparticipantWhereInputArgument
} from '$lib/api/rumbleClient/client';
import type { TableState } from '$lib/components/tanStackTable/tableState.svelte';
import {
	allOf,
	asCount,
	booleanFilter,
	containing,
	fetchEveryRow,
	orderFrom,
	pageArgs,
	pageOf,
	personContains,
	searchWords,
	stringFilter
} from '$lib/components/tanStackTable/serverQuery';
import { fetchReviewsOfMany } from '../assignment/board';

/** A word anywhere an individual shows it: name, school, texts, the roles applied for or given. */
function wordMatches(word: string): SingleparticipantWhereInputArgument {
	return {
		OR: [
			{ user: personContains(word) },
			{ school: containing(word) },
			{ motivation: containing(word) },
			{ experience: containing(word) },
			{ appliedForRoles: { name: containing(word) } },
			{ assignedRole: { name: containing(word) } }
		]
	};
}

function whereOf(conferenceId: string, state: TableState): SingleparticipantWhereInputArgument {
	const filters = new Map(state.columnFilters.map((filter) => [filter.id, filter.value]));
	const applied = booleanFilter(filters.get('applied'));
	const school = stringFilter(filters.get('school'));
	return {
		conferenceId: { eq: conferenceId },
		...(applied === undefined ? {} : { applied: { eq: applied } }),
		...(school ? { school } : {}),
		...allOf(searchWords(state.search).map(wordMatches))
	};
}

function listIndividuals(
	conferenceId: string,
	state: TableState,
	paging: { limit: number; offset: number }
) {
	return client.liveQuery.singleParticipants({
		__args: {
			where: whereOf(conferenceId, state),
			orderBy: orderFrom<SingleparticipantOrderInputArgument>(
				state.sorting,
				{
					applied: (direction) => ({ applied: direction }),
					school: (direction) => ({ school: direction })
				},
				{ createdAt: 'desc', id: 'asc' }
			),
			...paging
		},
		id: true,
		applied: true,
		school: true,
		appliedForRoles: { id: true, fontAwesomeIcon: true, name: true },
		assignedRole: { id: true, fontAwesomeIcon: true, name: true },
		motivation: true,
		experience: true,
		user: { id: true, familyName: true, givenName: true }
	});
}

/** One page of a conference's individual applications, searched, filtered and ordered by the backend. */
export async function fetchIndividualsPage(conferenceId: string, state: TableState) {
	const [individuals, total] = await Promise.all([
		listIndividuals(conferenceId, state, pageArgs(state)),
		client.liveQuery.singleParticipantsCount({ __args: { where: whereOf(conferenceId, state) } })
	]);
	const page = pageOf(individuals, state);
	// ratings are a draft table of their own; only this page's are read
	const reviews = await client.liveQuery.assignmentReviews({
		__args: { where: { singleParticipantId: { in: page.rows.map((single) => single.id) } } },
		singleParticipantId: true,
		evaluation: true
	});
	return { ...page, total: asCount(total), reviews };
}

/** Every individual application matching the table's search and filters, with its rating. */
export async function fetchAllIndividuals(conferenceId: string, state: TableState) {
	const rows = await fetchEveryRow((paging) => listIndividuals(conferenceId, state, paging));
	const reviews = await fetchReviewsOfMany(conferenceId, {
		delegationIds: [],
		singleParticipantIds: rows.map((row) => row.id)
	});
	return { rows, reviews };
}
