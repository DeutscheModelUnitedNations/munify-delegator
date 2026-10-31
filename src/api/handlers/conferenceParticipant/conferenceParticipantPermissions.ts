import { db, schema } from '#api/db/db';
import { apiError } from '#api/services/errors';
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
	// System admins read, update and delete every participant row.
	abilityBuilder.conferenceParticipant.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Everybody reads their own participant rows (payment, postal, attendance).
	abilityBuilder.conferenceParticipant.allow('read').when((ctx) => grantWhere(isOwnUser(ctx)));

	// Supervisors read the participant rows of their students. Supervision links this very row, so
	// only the conference they supervise them in.
	abilityBuilder.conferenceParticipant.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { supervisors: { user: { id } } } } : undefined;
	});

	// Delegates read the participant rows of their co-delegates.
	abilityBuilder.conferenceParticipant.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? { where: { delegationMember: { delegation: { members: { user: { id } } } } } }
			: undefined;
	});

	// Participant care (project management and participant care) reads, updates and deletes the
	// participant rows of its conference.
	abilityBuilder.conferenceParticipant
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));
}

/** Refuses (NOT_FOUND) unless the caller may update the participant row `id` (participant care). */
export async function assertCanUpdateParticipantStatus({
	ctx,
	id
}: {
	ctx: ApiContext;
	id: string;
}) {
	await assertAllowed({ ctx, table: 'conferenceParticipant', action: 'update', id });
}

/**
 * Refuses unless the caller may write a participant's status where the arguments point, before
 * anything is looked up: by `id`, the row has to be in `conferenceId` and updatable by the caller;
 * by user or email, the caller has to hold `manageParticipants` in the conference. Running first keeps the lookups (does this address have an account, is this card in use)
 * from answering anyone who may not write there.
 */
export async function assertCanUpsertParticipantStatus({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: { id?: string | null; conferenceId: string };
}) {
	ctx.mustBeLoggedIn();
	if (args.id) {
		await assertAllowed({
			ctx,
			table: 'conferenceParticipant',
			action: 'update',
			id: args.id,
			options: {
				extra: whereRows({
					table: schema.conferenceParticipant,
					filter: { conferenceId: args.conferenceId }
				})
			}
		});
		return;
	}
	await assertTeamPermission({
		ctx,
		conferenceId: args.conferenceId,
		permission: 'manageParticipants'
	});
}

/**
 * Refuses (INVALID_INPUT) unless the user is registered in the conference (`participatesIn`) or on
 * its team. About the user, not the caller. Attendance is narrower: it records participants only
 * (`attendanceEntryPermissions.ts`).
 */
async function assertParticipantOrTeamMemberIn({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}) {
	const user = await db.query.user.findFirst({
		where: {
			id: userId,
			OR: [participatesIn({ id: conferenceId }), { teamMember: { conferenceId } }]
		},
		columns: { id: true }
	});
	if (!user) {
		throw apiError({ code: 'INVALID_INPUT', message: m.userNotInConference() });
	}
}

/**
 * Refuses creating a participant row unless the caller holds `manageParticipants` in the conference
 * and the user belongs to it (`assertParticipantOrTeamMemberIn`).
 */
export async function assertCanCreateParticipantStatus({
	ctx,
	conferenceId,
	userId
}: {
	ctx: ApiContext;
	conferenceId: string;
	userId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	await assertParticipantOrTeamMemberIn({ conferenceId, userId });
}

/** Refuses the bulk attendance toggle unless the caller holds `manageParticipants` in the conference. */
export async function assertCanSetAttendanceForAll({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * Refuses unless the caller may set the school of the participant row: by `id`, a row of the
 * conference they may update (participant care); without, their own row in the conference, which
 * the team and the waiting list do not have. Returns the row's id.
 */
export async function assertCanSetParticipantSchool({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: { conferenceId: string; id?: string | null };
}) {
	if (args.id) {
		await assertAllowed({
			ctx,
			table: 'conferenceParticipant',
			action: 'update',
			id: args.id,
			options: {
				extra: whereRows({
					table: schema.conferenceParticipant,
					filter: { conferenceId: args.conferenceId }
				})
			}
		});
		return { participantId: args.id };
	}
	const own = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId: args.conferenceId, userId: ctx.mustBeLoggedIn().sub },
		columns: { id: true }
	});
	if (!own) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	return { participantId: own.id };
}
