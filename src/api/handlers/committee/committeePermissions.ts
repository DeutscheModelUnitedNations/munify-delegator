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
	// The committees are part of the seat overview: readable wherever their conference is.
	abilityBuilder.committee
		.allow('read')
		.when((ctx) => ({ where: { conference: readableConference(ctx) } }));
	abilityBuilder.committee.allow(['update', 'delete']).when(systemAdmin);

	// Project management sets up its committees. Which nations sit in them is the seat planning's
	// call, which the content lead shares (`setCommitteeNationSeat`, `setCommitteeRegionalBaseline`).
	abilityBuilder.committee
		.allow('delete')
		.when((ctx) => grantWhere(isTeamMemberOfConference(ctx, PROJECT_MANAGEMENT_ROLES)));
	// The content lead shapes the committees' content: names, headline and seats.
	abilityBuilder.committee
		.allow('update')
		.when((ctx) => grantWhere(isTeamMemberOfConference(ctx, SEAT_PLANNING_ROLES)));
}

/** Creating a committee changes the conference set-up, which is the management's call. */
export async function assertCanCreateCommittee(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'manageConference');
}

/**
 * Loads the committee through the caller's update ability, with what an update has to check
 * against: its seats per delegation, nation roles and assigned members.
 */
export async function assertCanUpdateCommittee(ctx: ApiContext, id: string) {
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

/** Refuses unless the caller's delete ability matches the committee. */
export async function assertCanDeleteCommittee(ctx: ApiContext, id: string) {
	await assertAllowed(ctx, 'committee', 'delete', id);
}

/**
 * Refuses unless the caller plans the seats of the committee's conference. Returns the committee's
 * conference and its regional baseline targets.
 */
export async function assertCanPlanCommitteeSeats(ctx: ApiContext, committeeId: string) {
	const committee = await db.query.committee
		.findFirst({
			where: { id: committeeId, conference: teamConference(ctx, 'planSeats') },
			columns: { conferenceId: true, regionalBaselineTargets: true }
		})
		.then(assertFindFirstExists);
	return committee;
}
