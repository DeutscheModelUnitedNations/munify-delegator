import { db } from '$api/db/db';

/** How the statistics dashboard narrows a conference down to a subset of its registrations. */
export type StatsFilterType =
	'ALL' | 'APPLIED' | 'NOT_APPLIED' | 'APPLIED_WITH_ROLE' | 'APPLIED_WITHOUT_ROLE';

// The `where` slot also accepts drizzle's EmptyFilter symbol; only the object half is useful
// as a building block here.
type WhereOf<T extends { findMany: (...args: never[]) => unknown }> = Extract<
	NonNullable<NonNullable<Parameters<T['findMany']>[0]>['where']>,
	object
>;

export type SingleParticipantFilter = WhereOf<typeof db.query.singleParticipant>;
export type DelegationFilter = WhereOf<typeof db.query.delegation>;
export type DelegationMemberFilter = WhereOf<typeof db.query.delegationMember>;
export type UserFilter = WhereOf<typeof db.query.user>;

/** The conditions a filter puts on a single participant, without the conference scope. */
export function singleParticipantConditions(filter: StatsFilterType): SingleParticipantFilter {
	switch (filter) {
		case 'ALL':
			return {};
		case 'APPLIED':
			return { applied: true };
		case 'NOT_APPLIED':
			return { applied: false };
		case 'APPLIED_WITH_ROLE':
			return { applied: true, assignedRoleId: { isNotNull: true } };
		case 'APPLIED_WITHOUT_ROLE':
			return { applied: true, assignedRoleId: { isNull: true } };
	}
}

/** The same for a delegation, where "has a role" means a nation or a non-state actor. */
export function delegationConditions(filter: StatsFilterType): DelegationFilter {
	switch (filter) {
		case 'ALL':
			return {};
		case 'APPLIED':
			return { applied: true };
		case 'NOT_APPLIED':
			return { applied: false };
		case 'APPLIED_WITH_ROLE':
			return {
				applied: true,
				OR: [
					{ assignedNationAlpha3Code: { isNotNull: true } },
					{ assignedNonStateActorId: { isNotNull: true } }
				]
			};
		case 'APPLIED_WITHOUT_ROLE':
			return {
				applied: true,
				assignedNationAlpha3Code: { isNull: true },
				assignedNonStateActorId: { isNull: true }
			};
	}
}

export function singleParticipantWhere(
	conferenceId: string,
	filter: StatsFilterType
): SingleParticipantFilter {
	return { conferenceId, ...singleParticipantConditions(filter) };
}

export function delegationWhere(conferenceId: string, filter: StatsFilterType): DelegationFilter {
	return { conferenceId, ...delegationConditions(filter) };
}

/** The member carries its own conference id; the filter applies to its delegation. */
export function delegationMemberWhere(
	conferenceId: string,
	filter: StatsFilterType
): DelegationMemberFilter {
	return { conferenceId, delegation: delegationConditions(filter) };
}

/** A user counts as selected when either of their participations is. */
export function userWhere(conferenceId: string, filter: StatsFilterType): UserFilter {
	return {
		OR: [
			{ singleParticipant: singleParticipantWhere(conferenceId, filter) },
			{ delegationMemberships: delegationMemberWhere(conferenceId, filter) }
		]
	};
}
