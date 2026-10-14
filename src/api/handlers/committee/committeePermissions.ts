import { db, schema } from '$api/db/db';
import { type ApiContext, abilityBuilder } from '$api/rumble';
import {
	assertAllowedRow,
	assertTeamRole,
	isTeamMemberOfConference,
	PROJECT_MANAGEMENT_ROLES,
	SEAT_PLANNING_ROLES,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerCommitteeAbilities() {
	// Ported from abilities/entities/committee.ts
	abilityBuilder.committee.allow('read');
	abilityBuilder.committee.allow(['update', 'delete']).when(systemAdmin);

	// Project management sets up its committees. Which nations sit in them is the seat planning's
	// call, which the content lead shares (`setCommitteeNationSeat`, `setCommitteeRegionalBaseline`).
	abilityBuilder.committee
		.allow('delete')
		.when((ctx) => where(isTeamMemberOfConference(ctx, PROJECT_MANAGEMENT_ROLES)));
	// The content lead shapes the committees' content: names, headline and seats.
	abilityBuilder.committee
		.allow('update')
		.when((ctx) => where(isTeamMemberOfConference(ctx, SEAT_PLANNING_ROLES)));
}

/** Creating a committee changes the conference set-up, which is the management's call. */
export async function assertCanCreateCommittee(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PROJECT_MANAGEMENT_ROLES);
}

/**
 * Loads the committee through the caller's update ability, with what an update has to check
 * against: its seats per delegation, nations and assigned members.
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
				nations: { columns: { alpha3Code: true } },
				delegationMembers: { columns: { delegationId: true } }
			}
		})
		.then(assertFindFirstExists);
}

/** Refuses unless the caller's delete ability matches the committee. */
export async function assertCanDeleteCommittee(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.committee,
		(await ctx.abilities.committee.filter('delete')).merge({ where: { id } }).sql.where
	);
}

/**
 * Refuses unless the caller plans the seats of the committee's conference. Returns the committee's
 * conference and its regional baseline targets.
 */
export async function assertCanPlanCommitteeSeats(ctx: ApiContext, committeeId: string) {
	const committee = await db.query.committee
		.findFirst({
			where: { id: committeeId },
			columns: { conferenceId: true, regionalBaselineTargets: true }
		})
		.then(assertFindFirstExists);
	await assertTeamRole(ctx, committee.conferenceId, SEAT_PLANNING_ROLES);
	return committee;
}
