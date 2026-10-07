import { client } from '$lib/api/rumbleClient/client';
import type {
	TeammemberOrderInputArgument,
	TeammemberWhereInputArgument,
	TeamroleEnum
} from '$lib/api/rumbleClient/client';
import type { TableState } from '$lib/components/tanStackTable/tableState.svelte';
import {
	allOf,
	asCount,
	enumFilter,
	fetchEveryRow,
	orderFrom,
	pageArgs,
	pageOf,
	personContains,
	searchWords
} from '$lib/components/tanStackTable/serverQuery';

/** Every role a team member can hold, for the role filter. */
export const TEAM_ROLES = [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE',
	'REVIEWER',
	'MEMBER',
	'TEAM_COORDINATOR',
	'CONTENT_LEAD'
] as const satisfies readonly TeamroleEnum[];

function isTeamRole(value: string): value is (typeof TEAM_ROLES)[number] {
	return TEAM_ROLES.some((role) => role === value);
}

function whereOf(conferenceId: string, state: TableState): TeammemberWhereInputArgument {
	const roles = enumFilter(
		state.columnFilters.find((filter) => filter.id === 'role')?.value
	).filter(isTeamRole);
	return {
		conferenceId: { eq: conferenceId },
		...allOf([
			...(roles.length > 0 ? [{ OR: roles.map((role) => ({ role })) }] : []),
			...searchWords(state.search).map((word) => ({ user: personContains(word) }))
		])
	};
}

function listTeamMembers(
	conferenceId: string,
	state: TableState,
	paging: { limit: number; offset: number }
) {
	return client.liveQuery.teamMembers({
		__args: {
			where: whereOf(conferenceId, state),
			orderBy: orderFrom<TeammemberOrderInputArgument>(
				state.sorting,
				{ role: (direction) => ({ role: direction }) },
				{ createdAt: 'asc', id: 'asc' }
			),
			...paging
		},
		id: true,
		role: true,
		user: {
			id: true,
			givenName: true,
			familyName: true,
			email: true,
			birthday: true,
			phone: true,
			street: true,
			zip: true,
			city: true,
			country: true,
			gender: true,
			foodPreference: true
		}
	});
}

/** One page of a conference's team, searched, filtered and ordered by the backend. */
export async function fetchTeamMembersPage(conferenceId: string, state: TableState) {
	const [members, total] = await Promise.all([
		listTeamMembers(conferenceId, state, pageArgs(state)),
		client.liveQuery.teamMembersCount({ __args: { where: whereOf(conferenceId, state) } })
	]);
	return { ...pageOf(members, state), total: asCount(total) };
}

/** Every team member matching the table's search and filters, for the export. */
export function fetchAllTeamMembers(conferenceId: string, state: TableState) {
	return fetchEveryRow((paging) => listTeamMembers(conferenceId, state, paging));
}
