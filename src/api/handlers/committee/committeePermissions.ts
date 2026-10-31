import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	assertTeamPermission,
	isTeamMemberOfConference,
	PROJECT_MANAGEMENT_ROLES,
	readableConference,
	SEAT_PLANNING_ROLES,
	systemAdmin,
	teamConference
} from '#api/services/authHelper/rules';
import { assertAllowed, grantWhere } from '#api/services/authHelper/utils';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerCommitteeAbilities() {
	// Anyone who may read the conference (`readableConference`) reads its committees: they are part
	// of the seat overview.
	abilityBuilder.committee
		.allow('read')
		.when((ctx) => ({ where: { conference: readableConference(ctx) } }));
	abilityBuilder.committee.allow(['update', 'delete']).when(systemAdmin);

	// Project management deletes its conference's committees.
	abilityBuilder.committee
		.allow('delete')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PROJECT_MANAGEMENT_ROLES })));
	// Seat planning (project management and content lead) updates its conference's committees: names,
	// headline and seats. Which nations sit in them is checked by `assertCanPlanCommitteeSeats`.
	abilityBuilder.committee
		.allow('update')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: SEAT_PLANNING_ROLES })));
}

/** Refuses unless the caller holds `manageConference` (project management) in the conference. */
export async function assertCanCreateCommittee({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageConference' });
}

/**
 * Refuses unless the caller may update the committee (seat planning of its conference). Returns
 * what an update has to check against: its conference, seats per delegation, roles and the
 * delegations of its seated members.
 */
export async function assertCanUpdateCommittee({ ctx, id }: { ctx: ApiContext; id: string }) {
	const updateFilter = (await ctx.abilities.committee.filter('update')).merge({
		where: { id }
	});
	return db.query.committee
		.findFirst({
			where: updateFilter.query.single.where,
			columns: { conferenceId: true, numOfSeatsPerDelegation: true },
			with: {
				roles: { columns: { id: true } },
				delegationMembers: { columns: { delegationId: true } }
			}
		})
		.then(assertFindFirstExists);
}

/** Refuses unless the caller may delete the committee (project management of its conference). */
export async function assertCanDeleteCommittee({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({ ctx, table: 'committee', action: 'delete', id });
}

/**
 * Refuses unless the caller holds `planSeats` (project management and content lead) in the
 * committee's conference. Returns the committee's conference and its regional baseline targets.
 */
export async function assertCanPlanCommitteeSeats({
	ctx,
	committeeId
}: {
	ctx: ApiContext;
	committeeId: string;
}) {
	const committee = await db.query.committee
		.findFirst({
			where: { id: committeeId, conference: teamConference({ ctx, permission: 'planSeats' }) },
			columns: { conferenceId: true, regionalBaselineTargets: true }
		})
		.then(assertFindFirstExists);
	return committee;
}
