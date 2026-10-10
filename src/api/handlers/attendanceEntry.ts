import { db, schema } from '$api/db/db';
import {
	abilityBuilder,
	enum_,
	object,
	pubsub as rumblePubsub,
	query,
	schemaBuilder
} from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	participatesIn,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { and, eq, isNull } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import type { Context } from '$api/context';

// Ported from abilities/entities/attendanceEntry.ts
abilityBuilder.attendanceEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

// Users see their own attendance entries.
abilityBuilder.attendanceEntry.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { conferenceParticipantStatus: { user: { id } } } } : undefined;
});

// Every team member of the conference may read them.
abilityBuilder.attendanceEntry.allow('read').when((ctx) => {
	const conferenceParticipantStatus = isTeamMemberOfConference(ctx);
	return conferenceParticipantStatus ? { where: { conferenceParticipantStatus } } : undefined;
});

// Participant care and project management manage them.
abilityBuilder.attendanceEntry.allow(['update', 'delete']).when((ctx) => {
	const conferenceParticipantStatus = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return conferenceParticipantStatus ? { where: { conferenceParticipantStatus } } : undefined;
});

// The sessions of a conference are the team's: every team member reads them, and starting and
// ending one goes through the mutations below, which check the team role themselves.
abilityBuilder.attendanceSession.allow(['read', 'update', 'delete']).when(systemAdmin);
abilityBuilder.attendanceSession.allow('read').when((ctx) => {
	const inTeamConference = isTeamMemberOfConference(ctx);
	return inTeamConference ? { where: inTeamConference } : undefined;
});

const attendanceSessionModeEnum = enum_({ tsName: 'attendanceSessionMode' });
const AttendanceEntryRef = object({ table: 'attendanceEntry' });
const AttendanceSessionRef = object({ table: 'attendanceSession' });
query({ table: 'attendanceEntry' });
query({ table: 'attendanceSession' });
const pubsub = rumblePubsub({ table: 'attendanceEntry' });
const sessionPubsub = rumblePubsub({ table: 'attendanceSession' });
// Recording attendance also flips the participant's status for the conference.
const conferenceParticipantStatusPubsub = rumblePubsub({
	table: 'conferenceParticipantStatus'
});

/**
 * Any team member of the conference may record attendance, not just management - the scanner is
 * on every team member's dashboard - and only for somebody who is part of the conference.
 */
async function assertMayRecordAttendance(ctx: Context, conferenceId: string, subjectId: string) {
	await assertTeamRole(ctx, conferenceId);
	const subject = await db.query.user.findFirst({
		where: {
			id: subjectId,
			OR: [...participatesIn({ id: conferenceId }).OR, { teamMember: { conferenceId } }]
		},
		columns: { id: true }
	});
	if (!subject) {
		throw new GraphQLError('This user does not take part in the conference');
	}
}

/** What createAttendanceEntry answers a second scan of one person in one session with. */
const ALREADY_SCANNED_MESSAGE = 'Already scanned in this session';

/** The session, once it is known to belong to the conference the scan is recorded for. */
async function assertSessionOfConference(sessionId: string, conferenceId: string) {
	const session = await db.query.attendanceSession.findFirst({
		where: { id: sessionId, conferenceId },
		columns: { id: true }
	});
	if (!session) {
		throw new GraphQLError('This session does not belong to the conference');
	}
}

/** Who records the scan; refuses an anonymous caller, an empty occasion and a foreign session. */
async function assertMayCreateEntry(
	ctx: Context,
	args: { userId: string; conferenceId: string; occasion: string; sessionId?: string | null }
) {
	const callerId = userId(ctx);
	if (!callerId) {
		throw new GraphQLError('Must be logged in');
	}
	if (!args.occasion.trim()) {
		throw new GraphQLError('Occasion must not be empty.');
	}

	await assertMayRecordAttendance(ctx, args.conferenceId, args.userId);
	if (args.sessionId) await assertSessionOfConference(args.sessionId, args.conferenceId);
	return callerId;
}

/**
 * The participant status row is created on demand, as the legacy upsert did. The no-op `set` is
 * how Postgres returns the existing row on conflict.
 */
async function ensureParticipantStatus(userId: string, conferenceId: string) {
	return db
		.insert(schema.conferenceParticipantStatus)
		.values({ userId, conferenceId })
		.onConflictDoUpdate({
			target: [
				schema.conferenceParticipantStatus.userId,
				schema.conferenceParticipantStatus.conferenceId
			],
			set: { userId }
		})
		.returning()
		.then(assertFirstEntryExists);
}

/**
 * The entry that already logged the person in the session. Several devices may work in one
 * session, so the session itself says who was scanned.
 */
async function scanInSession(sessionId: string | null | undefined, statusId: string) {
	if (!sessionId) return undefined;
	return db.query.attendanceEntry.findFirst({
		where: { sessionId, conferenceParticipantStatusId: statusId },
		columns: { id: true }
	});
}

/**
 * Stores an access card on the person's status. Any team member working in a session that hands
 * out cards may do this, which is what the session was set up for by participant care; outside such
 * a session cards are written through the status update, for participant care only.
 */
async function storeSessionCard(
	sessionId: string | null | undefined,
	conferenceId: string,
	statusId: string,
	accessCardId: string
) {
	const session = sessionId
		? await db.query.attendanceSession.findFirst({
				where: { id: sessionId, conferenceId },
				columns: { mode: true }
			})
		: undefined;
	if (session?.mode !== 'BADGE') {
		throw new GraphQLError('This session does not hand out access cards');
	}
	const holder = await db.query.conferenceParticipantStatus.findFirst({
		where: { conferenceId, accessCardId, id: { ne: statusId } },
		columns: { id: true }
	});
	if (holder) {
		throw new GraphQLError('This access card belongs to somebody else already');
	}
	await db
		.update(schema.conferenceParticipantStatus)
		.set({ accessCardId })
		.where(eq(schema.conferenceParticipantStatus.id, statusId));
}

schemaBuilder.mutationFields((t) => ({
	/** Starts a session; repeating it with the same id changes nothing, so a queue may retry. */
	startAttendanceSession: t.drizzleField({
		type: AttendanceSessionRef,
		args: {
			id: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			occasion: t.arg.string({ required: true }),
			mode: t.arg({ type: attendanceSessionModeEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const callerId = userId(ctx);
			if (!callerId) {
				throw new GraphQLError('Must be logged in');
			}
			if (!args.occasion.trim()) {
				throw new GraphQLError('Occasion must not be empty.');
			}
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

			await db
				.insert(schema.attendanceSession)
				.values({
					id: args.id,
					conferenceId: args.conferenceId,
					occasion: args.occasion.trim(),
					mode: args.mode,
					createdById: callerId
				})
				.onConflictDoNothing();
			// A repeated start must find the session where it was made, not in another conference
			await assertSessionOfConference(args.id, args.conferenceId);
			sessionPubsub.created();

			return db.query.attendanceSession
				.findFirst(
					query(
						(await ctx.abilities.attendanceSession.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** Ends a session for everybody working in it; ending it again changes nothing. */
	endAttendanceSession: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const session = await db.query.attendanceSession.findFirst({
				where: { id: args.id },
				columns: { conferenceId: true }
			});
			if (!session) {
				throw new GraphQLError('Session not found');
			}
			await assertTeamRole(ctx, session.conferenceId, PARTICIPANT_CARE_ROLES);

			await db
				.update(schema.attendanceSession)
				.set({ endedAt: new Date() })
				.where(
					and(eq(schema.attendanceSession.id, args.id), isNull(schema.attendanceSession.endedAt))
				);
			sessionPubsub.updated(args.id);
			return true;
		}
	}),

	createAttendanceEntry: t.drizzleField({
		type: AttendanceEntryRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			occasion: t.arg.string({ required: true }),
			sessionId: t.arg.id(),
			checkPassed: t.arg.boolean(),
			/** The card to store for the person; only a session that hands out cards takes one. */
			accessCardId: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const callerId = await assertMayCreateEntry(ctx, args);

			const status = await ensureParticipantStatus(args.userId, args.conferenceId);

			const readEntry = async (id: string) =>
				db.query.attendanceEntry
					.findFirst(
						query(
							(await ctx.abilities.attendanceEntry.filter('read')).merge({ where: { id } }).query
								.single
						)
					)
					.then(assertFindFirstExists);

			const accessCardId = args.accessCardId?.trim();
			if (accessCardId) {
				await storeSessionCard(args.sessionId, args.conferenceId, status.id, accessCardId);
				conferenceParticipantStatusPubsub.updated(status.id);
			}

			// A repeated scan that brought a card has done its work by storing it
			const scanned = await scanInSession(args.sessionId, status.id);
			if (scanned && accessCardId) return readEntry(scanned.id);
			if (scanned) throw new GraphQLError(ALREADY_SCANNED_MESSAGE);

			const created = await db
				.insert(schema.attendanceEntry)
				.values({
					conferenceParticipantStatusId: status.id,
					occasion: args.occasion,
					recordedById: callerId,
					sessionId: args.sessionId ?? undefined,
					checkPassed: args.checkPassed ?? undefined
				})
				.returning()
				.then(assertFirstEntryExists);

			pubsub.created();
			conferenceParticipantStatusPubsub.updated();
			// The session's entry count changed, which its readers show
			if (args.sessionId) sessionPubsub.updated(args.sessionId);

			return readEntry(created.id);
		}
	}),

	deleteAttendanceEntry: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.attendanceEntry)
				.where(
					(await ctx.abilities.attendanceEntry.filter('delete')).merge({ where: { id: args.id } })
						.sql.where
				)
				.returning({ id: schema.attendanceEntry.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Attendance entry not found, or not yours to delete');
			}
			pubsub.removed();

			return true;
		}
	})
}));
