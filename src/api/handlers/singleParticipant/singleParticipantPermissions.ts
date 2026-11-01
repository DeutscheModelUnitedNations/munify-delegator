import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	isOwnUser,
	isTeamMemberOfConference,
	maskedUntilRelease,
	onceReleased,
	PARTICIPANT_CARE_ROLES,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId, grantWhere } from '#api/services/authHelper/utils';
import type { Context } from '#api/context';
import { assertFindFirstExists } from '@m1212e/rumble';

/** The column masked from participants until release: the single participant's assigned role. */
const SINGLE_PARTICIPANT_ASSIGNMENT = { assignedRoleId: false } as const;

/** Matches the single participants the caller supervises. */
function supervisedParticipant(ctx: Context) {
	const id = callerUserId(ctx);
	return id ? { supervisors: { user: { id } } } : undefined;
}

export function registerSingleParticipantAbilities() {
	abilityBuilder.singleParticipant.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Everyone reads their own registration; `assignedRoleId` stays masked until the assignment is
	// released.
	abilityBuilder.singleParticipant.allow('read').when((ctx) =>
		maskedUntilRelease({
			filter: isOwnUser(ctx),
			assignmentColumns: SINGLE_PARTICIPANT_ASSIGNMENT
		})
	);
	abilityBuilder.singleParticipant.allow('read').when((ctx) => onceReleased(isOwnUser(ctx)));

	// Participant care (project management and participant care) reads, updates and deletes the
	// single participants of its conference.
	abilityBuilder.singleParticipant
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));

	// Everyone updates and withdraws their own registration until it is sent in.
	abilityBuilder.singleParticipant.allow(['update', 'delete']).when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { user: { id }, applied: false } } : undefined;
	});

	// Supervisors read the single participants they supervise; `assignedRoleId` stays masked until
	// the assignment is released.
	abilityBuilder.singleParticipant.allow('read').when((ctx) =>
		maskedUntilRelease({
			filter: supervisedParticipant(ctx),
			assignmentColumns: SINGLE_PARTICIPANT_ASSIGNMENT
		})
	);
	abilityBuilder.singleParticipant
		.allow('read')
		.when((ctx) => onceReleased(supervisedParticipant(ctx)));
}

/**
 * Lets a signed-in caller register themselves as a single participant; the role being a custom
 * role of the conference is the database's check (`single_participant_same_conference`,
 * `single_participant_role_kind`). Whether they may register at all (not already in the conference
 * otherwise, the registration window) is the service's. Returns the caller's id, who is the one
 * registered.
 */
export function assertCanCreateSingleParticipant(ctx: ApiContext) {
	return { callerId: ctx.mustBeLoggedIn().sub };
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the single participant - their
 * own registration until it is sent in, or `manageParticipants` (project management and
 * participant care) in its conference. The roles it applies for being custom roles of its
 * conference is the database's check (`single_participant_role_wish_same_conference`,
 * `single_participant_role_wish_role_kind`).
 */
export async function assertCanUpdateSingleParticipant({
	ctx,
	id
}: {
	ctx: ApiContext;
	id: string;
}) {
	// Checked up front: the role changes go to the join table directly, so an update that matched
	// no row would otherwise not stop them.
	await db.query.singleParticipant
		.findFirst({
			...(await ctx.abilities.singleParticipant.filter('update')).merge({ where: { id } }).query
				.single,
			columns: { id: true }
		})
		.then(assertFindFirstExists);
}

/**
 * Refuses unless the caller holds `manageParticipants` (project management and participant care) in
 * the conference, who place a user straight into a role. The role being one of its custom roles is
 * the database's check (`single_participant_same_conference`, `single_participant_role_kind`).
 */
export async function assertCanCreateAppliedSingleParticipant({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}
