import { db, schema } from '#api/db/db.js';
import { type ApiContext, abilityBuilder } from '#api/rumble.js';
import {
	assertTeamRole,
	isTeamMemberOfConference,
	readableConference,
	SEAT_PLANNING_ROLES,
	systemAdmin,
	where,
	assertAllowedById
} from '#api/services/authHelper.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';

export function registerConferenceRoleAbilities() {
	// The roles a conference offers are part of its seat overview: readable wherever the conference
	// is. The nations they stand for are global reference data and public.
	abilityBuilder.conferenceRole
		.allow('read')
		.when((ctx) => ({ where: { conference: readableConference(ctx) } }));
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

/** The kinds of role the seat planning creates, edits and deletes directly. */
type PlannedRoleKind = 'NON_STATE_ACTOR' | 'CUSTOM';

export async function assertCanCreateConferenceRole(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, SEAT_PLANNING_ROLES);
}

/** Loads the role of this `kind` through the caller's update ability, with its current seats. */
export async function assertCanUpdateConferenceRole(
	ctx: ApiContext,
	id: string,
	kind: PlannedRoleKind
) {
	const updateFilter = (await ctx.abilities.conferenceRole.filter('update')).merge({
		where: { id, kind }
	});
	return db.query.conferenceRole
		.findFirst({
			where: updateFilter.query.single.where,
			columns: { id: true, conferenceId: true, seatAmount: true }
		})
		.then(assertFindFirstExists);
}

/** Refuses unless the caller's delete ability matches the role of this `kind`. */
export async function assertCanDeleteConferenceRole(
	ctx: ApiContext,
	id: string,
	kind: PlannedRoleKind
) {
	await assertAllowedById(ctx, 'conferenceRole', 'delete', id, {
		extra: eq(schema.conferenceRole.kind, kind)
	});
}
