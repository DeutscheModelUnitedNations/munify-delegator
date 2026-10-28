import { client } from '#lib/api/rumbleClient/client.js';
import type {
	WaitinglistentryOrderInputArgument,
	WaitinglistentryWhereInputArgument
} from '#lib/api/rumbleClient/client.js';
import type { TableState } from '#lib/components/tanStackTable/tableState.svelte.js';
import {
	allOf,
	asCount,
	booleanFilter,
	containing,
	fetchEveryRow,
	orderFrom,
	pageArgs,
	pageOf,
	rangeFilter,
	stringFilter
} from '#lib/components/tanStackTable/serverQuery.js';
import { matchingUserIds } from '#lib/components/tanStackTable/matchingUsers.js';
import { birthdayBoundsForAge } from '#lib/helpers/ageChecker.js';

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

/** What the toolbar toggles leave out: hidden entries, and entries that already got a seat. */
export interface WaitingListToggles {
	hideHidden: boolean;
	showSeated: boolean;
}

/** The entries the table's search and filters leave, as a filter for the backend. */
export function waitingListWhere(
	conferenceId: string,
	state: Pick<TableState, 'columnFilters' | 'search'>,
	toggles: WaitingListToggles,
	startConference: Date | string | null | undefined,
	userIds: string[] | undefined
): WaitinglistentryWhereInputArgument {
	const filters = new Map(state.columnFilters.map((filter) => [filter.id, filter.value]));
	const school = stringFilter(filters.get('school'));
	return {
		conferenceId: { eq: conferenceId },
		...(toggles.showSeated ? {} : { assignedAt: { isNull: true } }),
		...hiddenWhere(booleanFilter(filters.get('hidden')), toggles.hideHidden),
		...(school ? { school: { name: school } } : {}),
		...allOf([
			...userTextWhere(filters),
			...birthdayWhere(filters.get('conferenceAge'), startConference),
			...(state.search.trim() ? [searchMatches(state.search.trim(), userIds ?? [])] : [])
		])
	};
}

/** The text anywhere an entry shows it: the person (found by `userIds`), the school, the texts. */
function searchMatches(text: string, userIds: string[]): WaitinglistentryWhereInputArgument {
	const like = containing(text);
	return {
		OR: [
			{ userId: { in: userIds } },
			{ school: { name: like } },
			{ motivation: like },
			{ experience: like },
			{ requests: like }
		]
	};
}

function listEntries(
	conferenceId: string,
	state: TableState,
	toggles: WaitingListToggles,
	startConference: Date | string | null | undefined,
	userIds: string[] | undefined,
	paging: { limit: number; offset: number }
) {
	return client.liveQuery.waitingListEntries({
		__args: {
			where: waitingListWhere(conferenceId, state, toggles, startConference, userIds),
			orderBy: orderFrom<WaitinglistentryOrderInputArgument>(
				state.sorting,
				{
					// the signup time is the place on the list
					createdAt: (direction) => ({ createdAt: direction }),
					position: (direction) => ({ createdAt: direction }),
					assignedAt: (direction) => ({ assignedAt: direction }),
					// the backend orders by the entry's own columns only: this groups the entries of
					// one school together rather than sorting them by name
					school: (direction) => ({ schoolId: direction }),
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
		school: { name: true },
		experience: true,
		motivation: true,
		requests: true,
		hidden: true,
		assignedAt: true,
		createdAt: true
	});
}

/**
 * Each still waiting, visible entry's place on the list: first come, first served. Only the ids
 * are read, so this stays cheap however long the list is.
 */
export async function fetchWaitingListPositions(conferenceId: string) {
	const entries = await client.liveQuery.waitingListEntries({
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
	return entries;
}

/** One page of the entries (by default those still waiting), searched, filtered and ordered by the backend. */
export async function fetchWaitingListPage(
	conferenceId: string,
	state: TableState,
	toggles: WaitingListToggles,
	startConference: Date | string | null | undefined
) {
	const userIds = await matchingUserIds(state.search);
	const [entries, total] = await Promise.all([
		listEntries(conferenceId, state, toggles, startConference, userIds, pageArgs(state)),
		client.liveQuery.waitingListEntriesCount({
			__args: {
				where: waitingListWhere(conferenceId, state, toggles, startConference, userIds)
			}
		})
	]);
	return { ...pageOf(entries, state), total: asCount(total) };
}

/** Every entry matching the table's search and filters, for the export. */
export async function fetchAllWaitingListEntries(
	conferenceId: string,
	state: TableState,
	toggles: WaitingListToggles,
	startConference: Date | string | null | undefined
) {
	const userIds = await matchingUserIds(state.search);
	return fetchEveryRow((paging) =>
		listEntries(conferenceId, state, toggles, startConference, userIds, paging)
	);
}
