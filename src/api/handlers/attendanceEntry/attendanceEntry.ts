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
	assertCanEndAttendanceSession,
	assertCanStartAttendanceSession,
	assertSessionOfConference,
	registerAttendanceEntryAbilities
} from './attendanceEntryPermissions';
import {
	attendanceEntryPubsub,
	attendanceSessionPubsub,
	conferenceParticipantPubsub
} from '#api/pubsub';
import { apiError } from '#api/services/errors/apiError';
import { m } from '#lib/paraglide/messages';
import { deleteIfAllowed, queryAllowed } from '#api/services/authHelper/utils';

registerAttendanceEntryAbilities();

const attendanceSessionModeEnum = enum_({ tsName: 'attendanceSessionMode' });
const AttendanceEntryRef = object({ table: 'attendanceEntry' });
const AttendanceSessionRef = object({ table: 'attendanceSession' });

/** The occasion as stored, trimmed; an empty one is refused. */
function checkedOccasion(occasion: string) {
	const trimmed = occasion.trim();
	if (!trimmed) throw apiError('INVALID_INPUT', m.attendanceOccasionEmpty());
	return trimmed;
}
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
			mode: t.arg({ type: attendanceSessionModeEnum, required: true }),
			/**
			 * Survey options of which a scanned person should have picked one; a person who picked none
			 * is shown that as an open point. A session that only records checks nothing, so it takes none.
			 */
			surveyOptionIds: t.arg.idList()
		},
		resolve: async (query, _root, args, ctx) => {
			const callerId = ctx.mustBeLoggedIn().sub;
			const occasion = checkedOccasion(args.occasion);
			const surveyOptionIds = args.surveyOptionIds ?? [];
			if (args.mode === 'RECORD' && surveyOptionIds.length > 0) {
				throw apiError('INVALID_INPUT', m.sessionSurveyOptionsNeedCheck());
			}
			await assertCanStartAttendanceSession(ctx, args.conferenceId, surveyOptionIds);

			await startSession(
				{
					id: args.id,
					conferenceId: args.conferenceId,
					occasion,
					mode: args.mode,
					createdById: callerId,
					showOnCertificate: await certificateFlagOf(args.conferenceId, occasion)
				},
				surveyOptionIds
			);
			// A repeated start must find the session where it was made, not in another conference
			await assertSessionOfConference(args.id, args.conferenceId);
			attendanceSessionPubsub.created();

			return db.query.attendanceSession
				.findFirst(query(await queryAllowed(ctx.abilities.attendanceSession, args.id)))
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * Lists an occasion - every session of that name - on the participation certificates, or takes
	 * it off them.
	 */
	setAttendanceOccasionOnCertificate: t.field({
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			occasion: t.arg.string({ required: true }),
			show: t.arg.boolean({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanStartAttendanceSession(ctx, args.conferenceId);
			await setOccasionOnCertificate(args.conferenceId, args.occasion, args.show);
			attendanceSessionPubsub.updated();
			return true;
		}
	}),

	/** Gives one session another name, which is the occasion it records. */
	renameAttendanceSession: t.field({
		type: 'Boolean',
		args: {
			id: t.arg.id({ required: true }),
			occasion: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const occasion = checkedOccasion(args.occasion);
			const conferenceId = await assertCanEndAttendanceSession(ctx, args.id);
			await renameSession(args.id, conferenceId, occasion);
			attendanceSessionPubsub.updated(args.id);
			return true;
		}
	}),

	/**
	 * Renames an occasion - every session of that name. A name another occasion has merges the two
	 * on the certificates.
	 */
	renameAttendanceOccasion: t.field({
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			occasion: t.arg.string({ required: true }),
			newOccasion: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const newOccasion = checkedOccasion(args.newOccasion);
			await assertCanStartAttendanceSession(ctx, args.conferenceId);
			await renameOccasion(args.conferenceId, args.occasion, newOccasion);
			attendanceSessionPubsub.updated();
			return true;
		}
	}),

	/** Ends a session for everybody working in it; ending it again changes nothing. */
	endAttendanceSession: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanEndAttendanceSession(ctx, args.id);

			await db
				.update(schema.attendanceSession)
				.set({ endedAt: new Date() })
				.where(whereRows(schema.attendanceSession, { id: args.id, endedAt: { isNull: true } }));
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
			const callerId = await assertCanCreateAttendanceEntry(ctx, args);

			const participantId = await ensureConferenceParticipant(db, args.conferenceId, args.userId);

			const readEntry = async (id: string) =>
				db.query.attendanceEntry
					.findFirst(query(await queryAllowed(ctx.abilities.attendanceEntry, id)))
					.then(assertFindFirstExists);

			const accessCardId = args.accessCardId?.trim();
			if (accessCardId) {
				await storeSessionCard(args.sessionId, args.conferenceId, participantId, accessCardId);
				conferenceParticipantPubsub.updated(participantId);
			}

			// A repeated scan that brought a card has done its work by storing it
			const scanned = await scanInSession(args.sessionId, participantId);
			if (scanned && accessCardId) return readEntry(scanned.id);
			if (scanned) throw apiError('ALREADY_SCANNED', m.alreadyScannedInSession());

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
			conferenceParticipantPubsub.updated();
			// The session's entry count changed, which its readers show
			attendanceSessionPubsub.updated(args.sessionId);

			return readEntry(created.id);
		}
	}),

	deleteAttendanceEntry: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed(ctx, 'attendanceEntry', args.id);
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
	/** The conference's scanner occasions and whether each is on the certificates. */
	certificateOccasions: t.field({
		type: [CertificateOccasion],
		args: {
			conferenceId: t.arg.id({ required: true }),
			/** Ignored; a new value makes the client ask again after a change. */
			revision: t.arg.int()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanStartAttendanceSession(ctx, args.conferenceId);
			return certificateOccasions(args.conferenceId);
		}
	})
}));
