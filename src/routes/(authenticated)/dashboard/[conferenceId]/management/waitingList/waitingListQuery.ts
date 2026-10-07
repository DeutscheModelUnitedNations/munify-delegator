import { client } from '$lib/api/rumbleClient/client';
import type {
	WaitinglistentryOrderInputArgument,
	WaitinglistentryWhereInputArgument
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
	rangeFilter,
	searchWords,
	stringFilter
} from '$lib/components/tanStackTable/serverQuery';
import { birthdayBoundsForAge } from '$lib/helpers/ageChecker';

/** The names of the columns the user can filter by text, and where their value lives. */
const userTextColumns = {
	family_name: 'familyName',
	given_name: 'givenName',
	email: 'email',
	phone: 'phone',
	city: 'city'
} as const;

/** The `hidden` condition: a filter on the hidden column wins over the toggle in the toolbar. */
function hiddenWhere(hidden: boolean | undefined, hideHidden: boolean) {
	if (hidden !== undefined) return { hidden: { eq: hidden } };
	return hideHidden ? { hidden: { eq: false } } : {};
}

/** The birthdays that make someone the filtered age when the conference starts. */
function birthdayWhere(filter: unknown, startConference: Date | string | null | undefined) {
	const age = rangeFilter(filter);
	return age && startConference
		? [{ user: { birthday: birthdayBoundsForAge(age, startConference) } }]
		: [];
}

/** The text filters on the person's own columns. */
function userTextWhere(filters: Map<string, unknown>) {
	return Object.entries(userTextColumns).flatMap(([columnId, field]) => {
		const filter = stringFilter(filters.get(columnId));
		return filter ? [{ user: { [field]: filter } }] : [];
	});
}

/** The entries the table's search and filters leave, as a filter for the backend. */
export function waitingListWhere(
	conferenceId: string,
	state: Pick<TableState, 'columnFilters' | 'search'>,
	hideHidden: boolean,
	startConference: Date | string | null | undefined
): WaitinglistentryWhereInputArgument {
	const filters = new Map(state.columnFilters.map((filter) => [filter.id, filter.value]));
	const school = stringFilter(filters.get('school'));
	return {
		conferenceId: { eq: conferenceId },
		assigned: { eq: false },
		...hiddenWhere(booleanFilter(filters.get('hidden')), hideHidden),
		...(school ? { school } : {}),
		...allOf([
			...userTextWhere(filters),
			...birthdayWhere(filters.get('conferenceAge'), startConference),
			...searchWords(state.search).map(wordMatches)
		])
	};
}

/** A word anywhere an entry shows it: the person's name or email, the school, the texts. */
function wordMatches(word: string): WaitinglistentryWhereInputArgument {
	const like = containing(word);
	return {
		OR: [
			{ user: personContains(word) },
			{ school: like },
			{ motivation: like },
			{ experience: like },
			{ requests: like }
		]
	};
}

function listEntries(
	conferenceId: string,
	state: TableState,
	hideHidden: boolean,
	startConference: Date | string | null | undefined,
	paging: { limit: number; offset: number }
) {
	return client.liveQuery.waitingListEntries({
		__args: {
			where: waitingListWhere(conferenceId, state, hideHidden, startConference),
			orderBy: orderFrom<WaitinglistentryOrderInputArgument>(
				state.sorting,
				{
					createdAt: (direction) => ({ createdAt: direction }),
					school: (direction) => ({ school: direction }),
					hidden: (direction) => ({ hidden: direction })
				},
				{ id: 'asc' }
			),
			...paging
		},
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
		school: true,
		experience: true,
		motivation: true,
		requests: true,
		hidden: true,
		createdAt: true
	});
}

/** One page of the entries still waiting, searched, filtered and ordered by the backend. */
export async function fetchWaitingListPage(
	conferenceId: string,
	state: TableState,
	hideHidden: boolean,
	startConference: Date | string | null | undefined
) {
	const [entries, total] = await Promise.all([
		listEntries(conferenceId, state, hideHidden, startConference, pageArgs(state)),
		client.liveQuery.waitingListEntriesCount({
			__args: { where: waitingListWhere(conferenceId, state, hideHidden, startConference) }
		})
	]);
	return { ...pageOf(entries, state), total: asCount(total) };
}

/** Every entry matching the table's search and filters, for the export. */
export function fetchAllWaitingListEntries(
	conferenceId: string,
	state: TableState,
	hideHidden: boolean,
	startConference: Date | string | null | undefined
) {
	return fetchEveryRow((paging) =>
		listEntries(conferenceId, state, hideHidden, startConference, paging)
	);
}
