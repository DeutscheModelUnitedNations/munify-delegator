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

export function registerConferenceRoleAbilities() {
	// The roles a conference offers are public, like the nations they may stand for.
	abilityBuilder.conferenceRole.allow('read');
	abilityBuilder.conferenceRole.allow(['update', 'delete']).when(systemAdmin);

	// The non-state actors and the custom roles (the press, …) are part of the seat planning, which
	// project management shares with the content lead. Deleting one is blocked while somebody holds
	// it. Nation roles follow the committee seats (`setCommitteeNationSeat`) and are not edited
	// directly.
	abilityBuilder.conferenceRole.allow(['update', 'delete']).when((ctx) => {
		const team = isTeamMemberOfConference(ctx, SEAT_PLANNING_ROLES);
		return where(
			team && { ...team, kind: { in: ['NON_STATE_ACTOR' as const, 'CUSTOM' as const] } }
		);
	});
}

export async function assertCanCreateCustomRole(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, SEAT_PLANNING_ROLES);
}

/** Loads the custom role through the caller's update ability, with its current seats. */
export async function assertCanUpdateCustomRole(ctx: ApiContext, id: string) {
	const updateFilter = (await ctx.abilities.conferenceRole.filter('update')).merge({
		where: { id, kind: 'CUSTOM' }
	});
	return db.query.conferenceRole
		.findFirst({
			where: updateFilter.query.single.where,
			columns: { id: true, conferenceId: true, seatAmount: true }
		})
		.then(assertFindFirstExists);
}

/** Refuses unless the caller's delete ability matches the custom role. */
export async function assertCanDeleteCustomRole(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.conferenceRole,
		(await ctx.abilities.conferenceRole.filter('delete')).merge({
			where: { id, kind: 'CUSTOM' }
		}).sql.where
	);
}

export async function assertCanCreateNonStateActor(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, SEAT_PLANNING_ROLES);
}

/** Loads the non-state actor through the caller's update ability, with its current seats. */
export async function assertCanUpdateNonStateActor(ctx: ApiContext, id: string) {
	const updateFilter = (await ctx.abilities.conferenceRole.filter('update')).merge({
		where: { id, kind: 'NON_STATE_ACTOR' }
	});
	return db.query.conferenceRole
		.findFirst({
			where: updateFilter.query.single.where,
			columns: { id: true, conferenceId: true, seatAmount: true }
		})
		.then(assertFindFirstExists);
}

/** Refuses unless the caller's delete ability matches the non-state actor. */
export async function assertCanDeleteNonStateActor(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.conferenceRole,
		(await ctx.abilities.conferenceRole.filter('delete')).merge({
			where: { id, kind: 'NON_STATE_ACTOR' }
		}).sql.where
	);
}
