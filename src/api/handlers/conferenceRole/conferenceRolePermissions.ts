import { db, schema } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	assertTeamPermission,
	isTeamMemberOfConference,
	readableConference,
	SEAT_PLANNING_ROLES,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere, assertAllowed } from '#api/services/authHelper/utils';
import { assertFindFirstExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';

export function registerConferenceRoleAbilities() {
	// Everybody who may read the conference (`readableConference`) reads its roles: they are part
	// of its seat overview. The nations they stand for are global reference data and public.
	abilityBuilder.conferenceRole
		.allow('read')
		.when((ctx) => ({ where: { conference: readableConference(ctx) } }));
	abilityBuilder.conferenceRole.allow(['update', 'delete']).when(systemAdmin);

	// Seat planning (project management and content lead) updates and deletes the non-state actors
	// and custom roles (the press, …) of its conference. Nation roles follow the committee seats
	// (`setCommitteeNationSeat`) and are not edited directly.
	abilityBuilder.conferenceRole.allow(['update', 'delete']).when((ctx) => {
		const team = isTeamMemberOfConference({ ctx, roles: SEAT_PLANNING_ROLES });
		return grantWhere(
			team && { ...team, kind: { in: ['NON_STATE_ACTOR' as const, 'CUSTOM' as const] } }
		);
	});
}

/** The kinds of role the seat planning creates, edits and deletes directly. */
type PlannedRoleKind = 'NON_STATE_ACTOR' | 'CUSTOM';

/**
 * Refuses (FORBIDDEN) unless the caller holds `planSeats` (project management and content lead) in
 * the conference the non-state actor or custom role is created in.
 */
export async function assertCanCreateConferenceRole({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'planSeats' });
}

/**
 * Refuses (NOT_FOUND) unless the role is of `kind` and the caller's update ability reaches it:
 * seat planning (`planSeats`: project management and content lead) of its conference. Returns it
 * with its conference and current seats.
 */
export async function assertCanUpdateConferenceRole({
	ctx,
	id,
	kind
}: {
	ctx: ApiContext;
	id: string;
	kind: PlannedRoleKind;
}) {
	const updateFilter = (await ctx.abilities.conferenceRole.filter('update')).merge({
		where: { id, kind }
	});
	return db.query.conferenceRole
		.findFirst({
			where: updateFilter.query.single.where,
			columns: { id: true, conferenceId: true, kind: true, seatAmount: true }
		})
		.then(assertFindFirstExists);
}

/**
 * Refuses (NOT_FOUND) unless the role is of `kind` and the caller's delete ability reaches it:
 * seat planning (`planSeats`: project management and content lead) of its conference.
 */
export async function assertCanDeleteConferenceRole({
	ctx,
	id,
	kind
}: {
	ctx: ApiContext;
	id: string;
	kind: PlannedRoleKind;
}) {
	await assertAllowed({
		ctx,
		table: 'conferenceRole',
		action: 'delete',
		id,
		options: {
			extra: whereRows({ table: schema.conferenceRole, filter: { kind } })
		}
	});
}
