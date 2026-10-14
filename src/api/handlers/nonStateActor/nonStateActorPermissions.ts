import { db, schema } from '$api/db/db';
import { type ApiContext, abilityBuilder } from '$api/rumble';
import {
	assertAllowedRow,
	assertTeamRole,
	isTeamMemberOfConference,
	SEAT_PLANNING_ROLES,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerNonStateActorAbilities() {
	abilityBuilder.nonStateActor.allow('read');
	abilityBuilder.nonStateActor.allow(['update', 'delete']).when(systemAdmin);

	// The non-state actors are part of the seat planning, which project management shares with the
	// content lead. Deleting one is blocked while a delegation is assigned to it.
	abilityBuilder.nonStateActor
		.allow(['update', 'delete'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, SEAT_PLANNING_ROLES)));
}

export async function assertCanCreateNonStateActor(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, SEAT_PLANNING_ROLES);
}

/** Loads the non-state actor through the caller's update ability, with its current seats. */
export async function assertCanUpdateNonStateActor(ctx: ApiContext, id: string) {
	const updateFilter = (await ctx.abilities.nonStateActor.filter('update')).merge({
		where: { id }
	});
	return db.query.nonStateActor
		.findFirst({
			where: updateFilter.query.single.where,
			columns: { id: true, conferenceId: true, seatAmount: true }
		})
		.then(assertFindFirstExists);
}

/** Refuses unless the caller's delete ability matches the non-state actor. */
export async function assertCanDeleteNonStateActor(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.nonStateActor,
		(await ctx.abilities.nonStateActor.filter('delete')).merge({ where: { id } }).sql.where
	);
}
