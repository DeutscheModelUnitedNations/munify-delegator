import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertCustomRolesOf,
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

	// Users read their own registration; `assignedRoleId` stays masked until the assignment is
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

	// Users may update and delete their own registration until they have applied.
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
 * Refuses unless the caller's update ability reaches the single participant and every role in
 * `applyForRolesIdList` is a custom role of its conference.
 */
export async function assertCanUpdateSingleParticipant({
	ctx,
	id,
	applyForRolesIdList
}: {
	ctx: ApiContext;
	id: string;
	applyForRolesIdList: readonly string[];
}) {
	// Checked up front: the role changes go to the join table directly, so an update that matched
	// no row would otherwise not stop them.
	const target = await db.query.singleParticipant
		.findFirst({
			...(await ctx.abilities.singleParticipant.filter('update')).merge({ where: { id } }).query
				.single,
			columns: { id: true },
			with: { participant: { columns: { conferenceId: true } } }
		})
		.then(assertFindFirstExists);
	await assertCustomRolesOf({
		conferenceId: target.participant.conferenceId,
		roleIds: applyForRolesIdList
	});
}

/** Refuses role ids that are not custom roles of the conference a single participant applies in. */
export { assertCustomRolesOf };

/**
 * Refuses unless the caller holds `manageParticipants` (participant care) in the conference and
 * `roleId` is one of its custom roles: only they place a user straight into a role.
 */
export async function assertCanCreateAppliedSingleParticipant({
	ctx,
	conferenceId,
	roleId
}: {
	ctx: ApiContext;
	conferenceId: string;
	roleId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	await assertCustomRolesOf({ conferenceId, roleIds: [roleId] });
}
