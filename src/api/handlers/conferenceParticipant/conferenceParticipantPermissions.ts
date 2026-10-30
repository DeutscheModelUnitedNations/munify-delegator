import { db, schema } from '#api/db/db';
import { apiError } from '#api/services/errors/apiError';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	isOwnUser,
	isTeamMemberOfConference,
	PARTICIPANT_CARE_ROLES,
	participatesIn,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId, grantWhere, assertAllowed } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';
import { whereRows } from '#api/db/whereRows';

export function registerConferenceParticipantAbilities() {
	// Ported from abilities/entities/conferenceParticipant.ts
	abilityBuilder.conferenceParticipant.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users see their own status.
	abilityBuilder.conferenceParticipant.allow('read').when((ctx) => grantWhere(isOwnUser(ctx)));

	// Supervisors see the status of the people they supervise. Supervision links this very row, so
	// it is the conference they supervise them in.
	abilityBuilder.conferenceParticipant.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { supervisors: { user: { id } } } } : undefined;
	});

	// Delegation members see the status of their co-delegates, in the conference they share.
	abilityBuilder.conferenceParticipant.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? { where: { delegationMember: { delegation: { members: { user: { id } } } } } }
			: undefined;
	});

	// Participant care and project management manage their conference's statuses.
	abilityBuilder.conferenceParticipant
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));
}

/** Refuses unless the caller's `update` ability reaches the status row `id`. */
export async function assertCanUpdateParticipantStatus(ctx: ApiContext, id: string) {
	await assertAllowed(ctx, 'conferenceParticipant', 'update', id);
}

/**
 * Refuses unless the caller may write a status in the place the arguments name, before anything
 * is looked up: addressed by `id`, the row has to be in `conferenceId` and within the caller's
 * `update` ability; addressed by user or email, the caller has to be the conference's participant
 * care. Running first keeps the lookups (does this address have an account, is this card in use)
 * from answering anyone who may not write there.
 */
export async function assertCanUpsertParticipantStatus(
	ctx: ApiContext,
	args: { id?: string | null; conferenceId: string }
) {
	ctx.mustBeLoggedIn();
	if (args.id) {
		await assertAllowed(ctx, 'conferenceParticipant', 'update', args.id, {
			extra: whereRows(schema.conferenceParticipant, { conferenceId: args.conferenceId })
		});
		return;
	}
	await assertTeamPermission(ctx, args.conferenceId, 'manageParticipants');
}

/**
 * Refuses unless the user is a participant of the conference (`participatesIn`) or on its team.
 * Attendance is narrower: it records participants only (`attendanceEntryPermissions.ts`).
 */
async function assertParticipantOrTeamMemberIn(conferenceId: string, userId: string) {
	const user = await db.query.user.findFirst({
		where: {
			id: userId,
			OR: [participatesIn({ id: conferenceId }), { teamMember: { conferenceId } }]
		},
		columns: { id: true }
	});
	if (!user) {
		throw apiError('INVALID_INPUT', m.userNotInConference());
	}
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
	await assertTeamPermission(ctx, conferenceId, 'manageParticipants');
	await assertParticipantOrTeamMemberIn(conferenceId, userId);
}

/** The bulk attendance toggle is for the conference's participant care. */
export async function assertCanSetAttendanceForAll(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'manageParticipants');
}

/**
 * The participant row whose school the caller may set, by id through the row's update ability
 * (participant care), or without one the caller's own row in the conference. Refuses when they take
 * no part in it (the team and the waiting list have no row).
 */
export async function assertCanSetParticipantSchool(
	ctx: ApiContext,
	args: { conferenceId: string; id?: string | null }
) {
	if (args.id) {
		await assertAllowed(ctx, 'conferenceParticipant', 'update', args.id, {
			extra: whereRows(schema.conferenceParticipant, { conferenceId: args.conferenceId })
		});
		return args.id;
	}
	const own = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId: args.conferenceId, userId: ctx.mustBeLoggedIn().sub },
		columns: { id: true }
	});
	if (!own) throw apiError('NOT_FOUND', m.updateNotFoundOrForbidden());
	return own.id;
}
