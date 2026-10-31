import { db, schema } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import {
	renameSession,
	reopenSession,
	scanInSession,
	setSessionOnCertificate,
	startSession
} from './attendanceEntryService';
import { ensureConferenceParticipant } from '#api/handlers/conferenceParticipant/conferenceParticipantService';
import { checkPassedForScan } from '#api/handlers/scanLookup/scanLookupService';
import {
	assertCanCreateAttendanceEntry,
	assertCanManageAttendanceSession,
	assertCanStartAttendanceSession,
	assertSessionOfConference,
	registerAttendanceEntryAbilities
} from './attendanceEntryPermissions';
import {
	attendanceEntryPubsub,
	attendanceSessionPubsub,
	conferenceParticipantPubsub
} from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerAttendanceEntryAbilities();

const attendanceSessionModeEnum = enum_({ tsName: 'attendanceSessionMode' });
const AttendanceEntryRef = object({ table: 'attendanceEntry' });
const AttendanceSessionRef = object({
	table: 'attendanceSession',
	adjust: (t) => ({
		entryCount: t.field({
			description: 'How many people were scanned in the session.',
			type: 'Int',
			resolve: (session) =>
				db.$count(
					schema.attendanceEntry,
					whereRows({ table: schema.attendanceEntry, filter: { sessionId: session.id } })
				)
		})
	})
});

/** An occasion as stored, trimmed; an empty one is refused. */
const occasionSchema = z
	.string()
	.trim()
	.min(1, { error: () => m.attendanceOccasionEmpty() });

query({ table: 'attendanceEntry' });
query({ table: 'attendanceSession' });

schemaBuilder.mutationFields((t) => ({
	startAttendanceSession: t.drizzleField({
		description:
			'Starts a session; repeating it with the same id changes nothing, so a queue may retry. A name another session of the conference has (ignoring case) is refused with CONFLICT.',
		type: AttendanceSessionRef,
		args: {
			id: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			occasion: t.arg.string({ required: true }).validate(occasionSchema),
			mode: t.arg({ type: attendanceSessionModeEnum, required: true }),
			surveyOptionIds: t.arg.idList({
				description:
					'Survey options of which a scanned person should have picked one; a person who picked none is shown that as an open point. A session that only records checks nothing, so it takes none.'
			})
		},
		validate: z
			.object({ mode: z.string(), surveyOptionIds: z.array(z.string()).nullish() })
			.refine((args) => args.mode !== 'RECORD' || !args.surveyOptionIds?.length, {
				error: () => m.sessionSurveyOptionsNeedCheck()
			}),
		resolve: async (query, _root, args, ctx) => {
			const callerId = ctx.mustBeLoggedIn().sub;
			const surveyOptionIds = args.surveyOptionIds ?? [];
			await assertCanStartAttendanceSession({
				ctx,
				conferenceId: args.conferenceId,
				surveyOptionIds
			});

			await startSession({
				values: {
					id: args.id,
					conferenceId: args.conferenceId,
					occasion: args.occasion,
					mode: args.mode,
					createdById: callerId
				},
				surveyOptionIds
			});
			// A repeated start must find the session where it was made, not in another conference
			await assertSessionOfConference({ sessionId: args.id, conferenceId: args.conferenceId });

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

	setAttendanceSessionOnCertificate: t.field({
		description: 'Lists a session on the participation certificates, or takes it off them.',
		type: 'Boolean',
		args: {
			id: t.arg.id({ required: true }),
			show: t.arg.boolean({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageAttendanceSession({ ctx, sessionId: args.id });
			await setSessionOnCertificate({ sessionId: args.id, show: args.show });
			return true;
		}
	}),

	renameAttendanceSession: t.field({
		description:
			'Gives a session another name; one another session of the conference has (ignoring case) is refused with CONFLICT.',
		type: 'Boolean',
		args: {
			id: t.arg.id({ required: true }),
			occasion: t.arg.string({ required: true }).validate(occasionSchema)
		},
		resolve: async (_root, args, ctx) => {
			const { conferenceId } = await assertCanManageAttendanceSession({ ctx, sessionId: args.id });
			await renameSession({ sessionId: args.id, conferenceId, occasion: args.occasion });
			return true;
		}
	}),

	endAttendanceSession: t.field({
		description: 'Ends a session for everybody working in it; ending it again changes nothing.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanManageAttendanceSession({ ctx, sessionId: args.id });

			await db
				.update(schema.attendanceSession)
				.set({ endedAt: new Date() })
				.where(
					whereRows({
						table: schema.attendanceSession,
						filter: { id: args.id, endedAt: { isNull: true } }
					})
				);
			attendanceSessionPubsub.updated(args.id);
			return true;
		}
	}),

	reopenAttendanceSession: t.field({
		description:
			'Opens an ended session again, keeping its scans; reopening a running one changes nothing.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanManageAttendanceSession({ ctx, sessionId: args.id });
			await reopenSession(args.id);
			return true;
		}
	}),

	createAttendanceEntry: t.drizzleField({
		description:
			'Records a scan of the person in a scanner session. A second scan in the same session is refused with ALREADY_SCANNED. Whether the check passed is decided here, as things stand when the scan is written; a session that only records checks nothing.',
		type: AttendanceEntryRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			sessionId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const { callerId } = await assertCanCreateAttendanceEntry({ ctx, args });

			const participantId = await ensureConferenceParticipant({
				tx: db,
				conferenceId: args.conferenceId,
				userId: args.userId
			});

			const readEntry = async (id: string) =>
				db.query.attendanceEntry
					.findFirst(
						query(
							(await ctx.abilities.attendanceEntry.filter('read')).merge({ where: { id } }).query
								.single
						)
					)
					.then(assertFindFirstExists);

			const scanned = await scanInSession({ sessionId: args.sessionId, statusId: participantId });
			if (scanned)
				throw apiError({ code: 'ALREADY_SCANNED', message: m.alreadyScannedInSession() });

			const checkPassed = await checkPassedForScan({
				conferenceId: args.conferenceId,
				sessionId: args.sessionId,
				userId: args.userId
			});
			const created = await db
				.insert(schema.attendanceEntry)
				.values({
					conferenceParticipantId: participantId,
					recordedById: callerId,
					sessionId: args.sessionId,
					checkPassed
				})
				.returning()
				.then(assertFirstEntryExists);

			attendanceEntryPubsub.created();
			conferenceParticipantPubsub.updated(participantId);
			// The session's entry count changed, which its readers show
			attendanceSessionPubsub.updated(args.sessionId);

			return readEntry(created.id);
		}
	}),

	deleteAttendanceEntry: t.field({
		description: 'Takes back a recorded scan.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const entry = await db.query.attendanceEntry.findFirst({
				where: { id: args.id },
				columns: { sessionId: true }
			});
			await deleteIfAllowed({ ctx, table: 'attendanceEntry', id: args.id });
			attendanceEntryPubsub.removed();
			// The session's entry count changed, which its readers show
			if (entry) attendanceSessionPubsub.updated(entry.sessionId);

			return true;
		}
	})
}));
