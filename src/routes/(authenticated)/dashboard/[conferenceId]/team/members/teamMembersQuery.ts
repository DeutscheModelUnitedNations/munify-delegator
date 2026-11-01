import { client } from '#lib/api/rumbleClient/client';
import type {
	TeammemberOrderInputArgument,
	TeammemberWhereInputArgument,
	TeamroleEnum
} from '#lib/api/rumbleClient/client';
import type { TableState } from '#lib/components/tanStackTable/tableState.svelte.js';
import {
	allOf,
	asCount,
	enumFilter,
	fetchEveryRow,
	orderFrom,
	pageArgs,
	pageOf
} from '#lib/components/tanStackTable/serverQuery';
import { matchingUserIds } from '#lib/components/tanStackTable/matchingUsers';

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

function whereOf({
	conferenceId,
	state,
	userIds
}: {
	conferenceId: string;
	state: TableState;
	userIds: string[] | undefined;
}): TeammemberWhereInputArgument {
	const roles = enumFilter(
		state.columnFilters.find((filter) => filter.id === 'role')?.value
	).filter(isTeamRole);
	return {
		conferenceId: { eq: conferenceId },
		...allOf([
			...(roles.length > 0 ? [{ OR: roles.map((role) => ({ role })) }] : []),
			...(userIds ? [{ userId: { in: userIds } }] : [])
		])
	};
}

function listTeamMembers({
	conferenceId,
	state,
	userIds,
	paging
}: {
	conferenceId: string;
	state: TableState;
	userIds: string[] | undefined;
	paging: { limit: number; offset: number };
}) {
	return client.liveQuery.teamMembers({
		__args: {
			where: whereOf({ conferenceId, state, userIds }),
			orderBy: orderFrom<TeammemberOrderInputArgument>({
				sorting: state.sorting,
				orders: { role: (direction) => ({ role: direction }) },
				fallback: { createdAt: 'asc', id: 'asc' }
			}),
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
export async function fetchTeamMembersPage({
	conferenceId,
	state
}: {
	conferenceId: string;
	state: TableState;
}) {
	const userIds = await matchingUserIds(state.search);
	const [members, total] = await Promise.all([
		listTeamMembers({ conferenceId, state, userIds, paging: pageArgs(state) }),
		client.liveQuery.teamMembersCount({
			__args: { where: whereOf({ conferenceId, state, userIds }) }
		})
	]);
	return { ...pageOf({ rows: members, state }), total: asCount(total) };
}

/** Every team member matching the table's search and filters, for the export. */
export async function fetchAllTeamMembers({
	conferenceId,
	state
}: {
	conferenceId: string;
	state: TableState;
}) {
	const userIds = await matchingUserIds(state.search);
	return fetchEveryRow((paging) => listTeamMembers({ conferenceId, state, userIds, paging }));
}
