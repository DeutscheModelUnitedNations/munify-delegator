import { db, schema } from '#api/db/db.js';
import { apiError } from '#api/services/errors/apiError.js';
import { abilityBuilder, type ApiContext } from '#api/rumble.js';
import {
	assertAllowedRow,
	assertTeamRole,
	assertUserInConference,
	isOwnUser,
	isTeamMemberOfConference,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	userId,
	where
} from '#api/services/authHelper.js';
import { m } from '#lib/paraglide/messages.js';

export function registerConferenceParticipantAbilities() {
	// Ported from abilities/entities/conferenceParticipant.ts
	abilityBuilder.conferenceParticipant.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users see their own status.
	abilityBuilder.conferenceParticipant.allow('read').when((ctx) => where(isOwnUser(ctx)));

	// Supervisors see the status of the people they supervise. Supervision links this very row, so
	// it is the conference they supervise them in.
	abilityBuilder.conferenceParticipant.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { supervisors: { user: { id } } } } : undefined;
	});

	// Delegation members see the status of their co-delegates, in the conference they share.
	abilityBuilder.conferenceParticipant.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id
			? { where: { delegationMember: { delegation: { members: { user: { id } } } } } }
			: undefined;
	});

	// Participant care and project management manage their conference's statuses.
	abilityBuilder.conferenceParticipant
		.allow(['read', 'update', 'delete'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));
}

/** Refuses unless the caller's `update` ability reaches the status row `id`. */
export async function assertCanUpdateParticipantStatus(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.conferenceParticipant,
		(await ctx.abilities.conferenceParticipant.filter('update')).merge({ where: { id } }).sql.where,
		m.updateNotFoundOrForbidden
	);
}

/**
 * Refuses to create a status row unless the caller is the conference's participant care, and the
 * user actually belongs to the conference. There is no row for the update ability to judge yet.
 */
export async function assertCanCreateParticipantStatus(
	ctx: ApiContext,
	conferenceId: string,
	userId: string
) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
	await assertUserInConference(conferenceId, userId);
}

/** The bulk attendance toggle is for the conference's participant care. */
export async function assertCanSetAttendanceForAll(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}

/**
 * The caller's own participant row in the conference, whose school they may change themselves.
 * Refuses when they take no part in it (the team and the waiting list have no row).
 */
export async function assertOwnParticipant(ctx: ApiContext, conferenceId: string) {
	const own = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId, userId: ctx.mustBeLoggedIn().sub },
		columns: { id: true }
	});
	if (!own) throw apiError('NOT_FOUND', m.updateNotFoundOrForbidden());
	return own.id;
}
