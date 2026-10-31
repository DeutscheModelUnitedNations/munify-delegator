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

	// Everyone reads their own participant rows (payment, postal, attendance).
	abilityBuilder.conferenceParticipant.allow('read').when((ctx) => grantWhere(isOwnUser(ctx)));

	// Supervisors read those of their students. Supervision links this very row, so only the
	// conference they supervise them in.
	abilityBuilder.conferenceParticipant.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { supervisors: { user: { id } } } } : undefined;
	});

	// Every delegate reads those of their co-delegates.
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
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the participant row `id`:
 * `manageParticipants` (project management and participant care) in its conference.
 */
export async function assertCanUpdateParticipantStatus({
	ctx,
	id
}: {
	ctx: ApiContext;
	id: string;
}) {
	await assertAllowed({ ctx, table: 'conferenceParticipant', action: 'update', id });
}

/** The user a status is addressed to by email; NOT_FOUND for an address without an account. */
async function userIdByEmail(email: string) {
	const user = await db.query.user.findFirst({ where: { email }, columns: { id: true } });
	if (!user) throw apiError({ code: 'NOT_FOUND', message: m.userNotFound() });
	return user.id;
}

/** Where `upsertConferenceParticipant` writes: an existing row, or a new one for the user. */
export type ParticipantStatusTarget = { existingId: string } | { userId: string };

/**
 * Refuses unless the caller may write a participant's status where the arguments point, and
 * resolves where that is. By `id`, the row has to be in `conferenceId` and updatable by the caller
 * (NOT_FOUND). By user id or email, the caller has to hold `manageParticipants` (project
 * management and participant care) in the conference before anything is looked up, so the lookups
 * (does this address have an account) answer nobody else; then the person's row there is the
 * target, or, for a person without one, a new row, if they take part in the conference or are on
 * its team (INVALID_INPUT otherwise).
 */
export async function assertCanUpsertParticipantStatus({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: {
		id?: string | null;
		conferenceId: string;
		userId?: string | null;
		userEmail?: string | null;
	};
}): Promise<ParticipantStatusTarget> {
	ctx.mustBeLoggedIn();
	const { conferenceId } = args;
	if (args.id) {
		await assertAllowed({
			ctx,
			table: 'conferenceParticipant',
			action: 'update',
			id: args.id,
			options: {
				extra: whereRows({ table: schema.conferenceParticipant, filter: { conferenceId } })
			}
		});
		return { existingId: args.id };
	}
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	const userId = args.userId ?? (args.userEmail ? await userIdByEmail(args.userEmail) : undefined);
	if (!userId) throw apiError({ code: 'INVALID_INPUT', message: m.participantStatusNeedsUser() });

	const existing = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId, userId },
		columns: { id: true }
	});
	if (existing) return { existingId: existing.id };
	await assertParticipantOrTeamMemberIn({ conferenceId, userId });
	return { userId };
}

/**
 * Refuses the bulk attendance toggle unless the caller holds `manageParticipants` (project
 * management and participant care) in the conference.
 */
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
 * Refuses (NOT_FOUND) unless the caller may set the school of the participant row: by `id`, a row
 * of the conference they may update (`manageParticipants`: project management and participant
 * care); without, their own row in the conference, which the team and the waiting list do not
 * have. Returns the row's id.
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
