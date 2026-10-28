import { db } from '#api/db/db.js';
import { scheduleEmailSweep } from '#api/handlers/email/emailSweep.js';
import { enum_, object, query, schemaBuilder } from '#api/rumble.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	createStatus,
	isOfAgeAtConference,
	planParticipantStatusUpsert,
	setAttendanceForAll,
	setParticipantSchool,
	updateStatus
} from './conferenceParticipantService';
import { resolveSchoolChoice } from '#api/handlers/school/schoolService.js';
import { schoolChoiceSchema } from '#lib/schemata/schoolChoice.js';
import {
	assertCanCreateParticipantStatus,
	assertCanSetAttendanceForAll,
	assertCanUpdateParticipantStatus,
	assertCanUpsertParticipantStatus,
	registerConferenceParticipantAbilities,
	assertCanSetParticipantSchool
} from './conferenceParticipantPermissions';
import { conferenceParticipantPubsub, schoolPubsub } from '#api/pubsub.js';
import { readableById } from '#api/services/authHelper.js';

registerConferenceParticipantAbilities();

const ConferenceParticipantRef = object({
	table: 'conferenceParticipant',
	adjust: (t) => ({
		/** 18 by the start of the conference, so no guardian has to consent; see `isOfAgeAtConference`. */
		ofAgeAtConference: t.field({
			type: 'Boolean',
			resolve: (participant) => isOfAgeAtConference(participant.id)
		})
	})
});

const BulkStatusUpdateResult = schemaBuilder.simpleObject(
	'UpdateAllConferenceParticipantsResponse',
	{
		fields: (t) => ({
			/** How many participants the bulk update touched. */
			changed: t.int()
		})
	}
);
query({ table: 'conferenceParticipant' });

const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });
const mediaConsentStatusEnum = enum_({ tsName: 'mediaConsentStatus' });

schemaBuilder.mutationFields((t) => ({
	/**
	 * Upserts a participant's status. The row is addressed either by id, or by conference plus
	 * user id, or by conference plus user email - the management UI knows different things in
	 * different places, which is why all three are accepted.
	 */
	updateConferenceParticipant: t.drizzleField({
		type: ConferenceParticipantRef,
		args: {
			id: t.arg.id(),
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id(),
			userEmail: t.arg.string(),
			termsAndConditions: t.arg({ type: administrativeStatusEnum }),
			guardianConsent: t.arg({ type: administrativeStatusEnum }),
			mediaConsent: t.arg({ type: administrativeStatusEnum }),
			mediaConsentStatus: t.arg({ type: mediaConsentStatusEnum }),
			paymentStatus: t.arg({ type: administrativeStatusEnum }),
			didAttend: t.arg.boolean(),
			assignedDocumentNumber: t.arg.int(),
			assignNextDocumentNumber: t.arg.boolean(),
			accessCardId: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpsertParticipantStatus(ctx, args);
			const upsert = await planParticipantStatusUpsert(args);
			let statusId: string;
			if (upsert.existingId !== undefined) {
				await assertCanUpdateParticipantStatus(ctx, upsert.existingId);
				statusId = await updateStatus(upsert.existingId, upsert.values);
			} else {
				await assertCanCreateParticipantStatus(ctx, args.conferenceId, upsert.userId);
				statusId = await createStatus(upsert.values, args.conferenceId, upsert.userId);
			}

			// Updated or created on the spot, so one notification on whichever row now holds it.
			conferenceParticipantPubsub.updated(statusId);
			scheduleEmailSweep(args.conferenceId, ctx.requestUrl().origin);

			return db.query.conferenceParticipant
				.findFirst(query(await readableById(ctx.abilities.conferenceParticipant, statusId)))
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * Sets a person's school in a conference: the only school a person taking part has, which the
	 * seats and numbers per school count, and which the assignment never changes. Without `id` it is
	 * the caller's own (as a delegate, single participant or supervisor); with it, participant care
	 * correcting somebody's. Both school arguments null removes it.
	 */
	setParticipantSchool: t.drizzleField({
		type: ConferenceParticipantRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			id: t.arg.id(),
			schoolId: t.arg.id(),
			schoolName: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			schoolChoiceSchema.parse(args);
			const id = await assertCanSetParticipantSchool(ctx, args);
			await setParticipantSchool(db, [id], await resolveSchoolChoice(args));

			conferenceParticipantPubsub.updated(id);
			if (args.schoolName) schoolPubsub.created();

			return db.query.conferenceParticipant
				.findFirst(query(await readableById(ctx.abilities.conferenceParticipant, id)))
				.then(assertFindFirstExists);
		}
	}),

	/** Bulk attendance toggle across a whole conference, for its participant care. */
	updateAllConferenceParticipants: t.field({
		type: BulkStatusUpdateResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			didAttend: t.arg.boolean()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanSetAttendanceForAll(ctx, args.conferenceId);
			const changed = await setAttendanceForAll(args);

			conferenceParticipantPubsub.created();
			scheduleEmailSweep(args.conferenceId, ctx.requestUrl().origin);

			return { changed };
		}
	})
}));
