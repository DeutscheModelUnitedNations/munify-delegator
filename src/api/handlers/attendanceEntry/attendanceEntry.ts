import { db, schema } from '$api/db/db';
import { abilityBuilder, enum_, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { and, eq, isNull } from 'drizzle-orm';
import {
	assertMayCreateEntry,
	assertSessionOfConference,
	ensureParticipantStatus,
	scanInSession,
	storeSessionCard
} from './attendanceEntryService';
import {
	attendanceEntryPubsub,
	attendanceSessionPubsub,
	conferenceParticipantStatusPubsub
} from '$api/pubsub';
import { apiError } from '$api/services/apiError';
import { m } from '$lib/paraglide/messages';

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
				throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
			}
			if (!args.occasion.trim()) {
				throw apiError('INVALID_INPUT', m.attendanceOccasionEmpty());
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
			attendanceSessionPubsub.created();

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
				throw apiError('NOT_FOUND', m.sessionNotFound());
			}
			await assertTeamRole(ctx, session.conferenceId, PARTICIPANT_CARE_ROLES);

			await db
				.update(schema.attendanceSession)
				.set({ endedAt: new Date() })
				.where(
					and(eq(schema.attendanceSession.id, args.id), isNull(schema.attendanceSession.endedAt))
				);
			attendanceSessionPubsub.updated(args.id);
			return true;
		}
	}),

	createAttendanceEntry: t.drizzleField({
		type: AttendanceEntryRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			sessionId: t.arg.id({ required: true }),
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
			if (scanned) throw apiError('ALREADY_SCANNED', m.alreadyScannedInSession());

			const created = await db
				.insert(schema.attendanceEntry)
				.values({
					conferenceParticipantStatusId: status.id,
					recordedById: callerId,
					sessionId: args.sessionId,
					checkPassed: args.checkPassed ?? undefined
				})
				.returning()
				.then(assertFirstEntryExists);

			attendanceEntryPubsub.created();
			conferenceParticipantStatusPubsub.updated();
			// The session's entry count changed, which its readers show
			attendanceSessionPubsub.updated(args.sessionId);

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
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
			attendanceEntryPubsub.removed();

			return true;
		}
	})
}));
