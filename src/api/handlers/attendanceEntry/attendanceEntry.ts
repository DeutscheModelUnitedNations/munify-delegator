import { db, schema } from '#api/db/db';
import { enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { recordScan, startSession, updateAttendanceSession } from './attendanceEntryService';
import {
	assertCanCreateAttendanceEntry,
	assertCanManageAttendanceSession,
	assertCanStartAttendanceSession,
	assertSessionOfConference,
	registerAttendanceEntryAbilities
} from './attendanceEntryPermissions';
import { attendanceEntryPubsub, attendanceSessionPubsub } from '#api/pubsub';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerAttendanceEntryAbilities();

/** Changes a session the caller may manage. */
async function manageSession({
	ctx,
	...change
}: { ctx: ApiContext } & Parameters<typeof updateAttendanceSession>[0]) {
	await assertCanManageAttendanceSession({ ctx, sessionId: change.id });
	await updateAttendanceSession(change);
	return true;
}

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
			await assertCanStartAttendanceSession({ ctx, conferenceId: args.conferenceId });

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
		resolve: (_root, args, ctx) => manageSession({ ctx, id: args.id, showOnCertificate: args.show })
	}),

	renameAttendanceSession: t.field({
		description:
			'Gives a session another name; one another session of the conference has (ignoring case) is refused with CONFLICT.',
		type: 'Boolean',
		args: {
			id: t.arg.id({ required: true }),
			occasion: t.arg.string({ required: true }).validate(occasionSchema)
		},
		resolve: (_root, args, ctx) => manageSession({ ctx, id: args.id, occasion: args.occasion })
	}),

	endAttendanceSession: t.field({
		description: 'Ends a session for everybody working in it; ending it again changes nothing.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: (_root, args, ctx) => manageSession({ ctx, id: args.id, ended: true })
	}),

	reopenAttendanceSession: t.field({
		description:
			'Opens an ended session again, keeping its scans; reopening a running one changes nothing.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: (_root, args, ctx) => manageSession({ ctx, id: args.id, ended: false })
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
			const entryId = await recordScan({
				conferenceId: args.conferenceId,
				sessionId: args.sessionId,
				userId: args.userId,
				recordedById: callerId
			});

			return db.query.attendanceEntry
				.findFirst(
					query(
						(await ctx.abilities.attendanceEntry.filter('read')).merge({ where: { id: entryId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
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
