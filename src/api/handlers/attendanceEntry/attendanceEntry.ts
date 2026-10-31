import { db, schema } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import {
	certificateFlagOf,
	certificateOccasions,
	renameOccasion,
	renameSession,
	scanInSession,
	setOccasionOnCertificate,
	startSession,
	storeSessionCard
} from './attendanceEntryService';
import { ensureConferenceParticipant } from '#api/handlers/conferenceParticipant/conferenceParticipantService';
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
const AttendanceSessionRef = object({ table: 'attendanceSession' });

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
			'Starts a session; repeating it with the same id changes nothing, so a queue may retry.',
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
					createdById: callerId,
					showOnCertificate: await certificateFlagOf({
						conferenceId: args.conferenceId,
						occasion: args.occasion
					})
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

	setAttendanceOccasionOnCertificate: t.field({
		description:
			'Lists an occasion - every session of that name - on the participation certificates, or takes it off them.',
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			occasion: t.arg.string({ required: true }),
			show: t.arg.boolean({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanStartAttendanceSession({ ctx, conferenceId: args.conferenceId });
			await setOccasionOnCertificate({
				conferenceId: args.conferenceId,
				occasion: args.occasion,
				show: args.show
			});
			return true;
		}
	}),

	renameAttendanceSession: t.field({
		description: 'Gives one session another name, which is the occasion it records.',
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

	renameAttendanceOccasion: t.field({
		description:
			'Renames an occasion - every session of that name. A name another occasion has merges the two on the certificates.',
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			occasion: t.arg.string({ required: true }),
			newOccasion: t.arg.string({ required: true }).validate(occasionSchema)
		},
		resolve: async (_root, args, ctx) => {
			await assertCanStartAttendanceSession({ ctx, conferenceId: args.conferenceId });
			await renameOccasion({
				conferenceId: args.conferenceId,
				from: args.occasion,
				to: args.newOccasion
			});
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

			const accessCardId = args.accessCardId?.trim();
			if (accessCardId) {
				await storeSessionCard({
					sessionId: args.sessionId,
					conferenceId: args.conferenceId,
					statusId: participantId,
					accessCardId
				});
			}

			// A repeated scan that brought a card has done its work by storing it
			const scanned = await scanInSession({ sessionId: args.sessionId, statusId: participantId });
			if (scanned && accessCardId) return readEntry(scanned.id);
			if (scanned)
				throw apiError({ code: 'ALREADY_SCANNED', message: m.alreadyScannedInSession() });

			const created = await db
				.insert(schema.attendanceEntry)
				.values({
					conferenceParticipantId: participantId,
					recordedById: callerId,
					sessionId: args.sessionId,
					checkPassed: args.checkPassed ?? undefined
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
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'attendanceEntry', id: args.id });
			attendanceEntryPubsub.removed();

			return true;
		}
	})
}));

const CertificateOccasion = schemaBuilder.simpleObject('CertificateOccasion', {
	description:
		'An occasion of the scanner as the certificates list it: its sessions merged by name.',
	fields: (t) => ({
		name: t.string(),
		sessions: t.int(),
		entries: t.int(),
		firstStartedAt: t.field({ type: 'DateTime' }),
		showOnCertificate: t.boolean()
	})
});

schemaBuilder.queryFields((t) => ({
	certificateOccasions: t.field({
		description: "The conference's scanner occasions and whether each is on the certificates.",
		type: [CertificateOccasion],
		args: {
			conferenceId: t.arg.id({ required: true }),
			/** Ignored; a new value makes the client ask again after a change. */
			revision: t.arg.int()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanStartAttendanceSession({ ctx, conferenceId: args.conferenceId });
			return certificateOccasions(args.conferenceId);
		}
	})
}));
