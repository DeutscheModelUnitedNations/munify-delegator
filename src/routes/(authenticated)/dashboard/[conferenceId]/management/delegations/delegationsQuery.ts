import { client } from '$lib/api/rumbleClient/client';
import type {
	DelegationOrderInputArgument,
	DelegationWhereInputArgument
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
import { fetchAssignmentReviews } from '../assignment/board';
import { nationCodesMatching } from '$lib/utils/nationTranslationHelper.svelte';

/** A word anywhere a delegation shows it: school, entry code, role, a member's name. */
function wordMatches(word: string): DelegationWhereInputArgument {
	const nationCodes = nationCodesMatching(word);
	return {
		OR: [
			{ school: containing(word) },
			{ entryCode: containing(word) },
			{ assignedNonStateActor: { name: containing(word) } },
			...(nationCodes.length > 0 ? [{ assignedNationAlpha3Code: { in: nationCodes } }] : []),
			{ members: { user: personContains(word) } }
		]
	};
}

/** The rows the table's search and filters leave, as a filter for the backend. */
export function delegationsWhere(
	conferenceId: string,
	search: string,
	filters: TableState['columnFilters']
): DelegationWhereInputArgument {
	const valueOf = (id: string) => filters.find((filter) => filter.id === id)?.value;
	const applied = booleanFilter(valueOf('applied'));
	const school = stringFilter(valueOf('school'));
	const entryCode = stringFilter(valueOf('entryCode'));
	return {
		conferenceId: { eq: conferenceId },
		...(applied === undefined ? {} : { applied: { eq: applied } }),
		...(school ? { school } : {}),
		...(entryCode ? { entryCode } : {}),
		...allOf(searchWords(search).map(wordMatches))
	};
}

function listDelegations(
	conferenceId: string,
	state: TableState,
	paging: { limit: number; offset: number }
) {
	return client.liveQuery.delegations({
		__args: {
			where: delegationsWhere(conferenceId, state.search, state.columnFilters),
			orderBy: orderFrom<DelegationOrderInputArgument>(
				state.sorting,
				{
					entryCode: (direction) => ({ entryCode: direction }),
					applied: (direction) => ({ applied: direction }),
					school: (direction) => ({ school: direction })
				},
				{ createdAt: 'desc', id: 'asc' }
			),
			...paging
		},
		id: true,
		entryCode: true,
		applied: true,
		school: true,
		assignedNation: { alpha2Code: true, alpha3Code: true },
		assignedNonStateActor: { id: true, name: true, fontAwesomeIcon: true },
		members: { id: true },
		appliedForRoles: { id: true }
	});
}

/** One page of a conference's delegations, searched, filtered and ordered by the backend. */
export async function fetchDelegationsPage(conferenceId: string, state: TableState) {
	const [delegations, total] = await Promise.all([
		listDelegations(conferenceId, state, pageArgs(state)),
		client.liveQuery.delegationsCount({
			__args: { where: delegationsWhere(conferenceId, state.search, state.columnFilters) }
		})
	]);
	const page = pageOf(delegations, state);
	// ratings are a draft table of their own; only this page's are read
	const reviews = await client.liveQuery.assignmentReviews({
		__args: { where: { delegationId: { in: page.rows.map((delegation) => delegation.id) } } },
		delegationId: true,
		evaluation: true
	});
	return { ...page, total: asCount(total), reviews };
}

/** Every delegation matching the table's search and filters, with its rating, for the export. */
export async function fetchAllDelegations(conferenceId: string, state: TableState) {
	const [rows, reviews] = await Promise.all([
		fetchEveryRow((paging) => listDelegations(conferenceId, state, paging)),
		fetchAssignmentReviews(conferenceId)
	]);
	return { rows, reviews };
}
