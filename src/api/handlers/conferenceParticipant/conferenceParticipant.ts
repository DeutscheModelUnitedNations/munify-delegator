import { db } from '#api/db/db';
import { scheduleEmailSweep } from '#api/handlers/email/emailSweep';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	createStatus,
	isOfAgeAtConference,
	planParticipantStatusUpsert,
	setAttendanceForAll,
	setParticipantSchool,
	updateStatus
} from './conferenceParticipantService';
import { resolveSchoolChoice } from '#api/handlers/school/schoolService';
import { schoolNameSchema } from '#lib/schemata/schoolChoice';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';
import {
	assertCanCreateParticipantStatus,
	assertCanSetAttendanceForAll,
	assertCanUpdateParticipantStatus,
	assertCanUpsertParticipantStatus,
	registerConferenceParticipantAbilities,
	assertCanSetParticipantSchool
} from './conferenceParticipantPermissions';

registerConferenceParticipantAbilities();

const ConferenceParticipantRef = object({
	table: 'conferenceParticipant',
	adjust: (t) => ({
		ofAgeAtConference: t.field({
			description:
				'18 by the start of the conference, so no guardian has to consent; see `isOfAgeAtConference`.',
			type: 'Boolean',
			resolve: (participant) => isOfAgeAtConference(participant.id)
		})
	})
});

const BulkStatusUpdateResult = schemaBuilder.simpleObject(
	'UpdateAllConferenceParticipantsResponse',
	{
		fields: (t) => ({
			changed: t.int({ description: 'How many participants the bulk update touched.' })
		})
	}
);
query({ table: 'conferenceParticipant' });

const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });
const mediaConsentStatusEnum = enum_({ tsName: 'mediaConsentStatus' });

schemaBuilder.mutationFields((t) => ({
	upsertConferenceParticipant: t.drizzleField({
		description:
			"Upserts a participant's status. The row is addressed either by id, or by conference plus user id, or by conference plus user email - the management UI knows different things in different places, which is why all three are accepted.",
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
		validate: z
			.object({
				id: z.string().nullish(),
				userId: z.string().nullish(),
				userEmail: z.string().nullish()
			})
			.refine((args) => args.id || args.userId || args.userEmail, {
				error: () => m.participantStatusNeedsLookup()
			}),
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpsertParticipantStatus({ ctx, args });
			const upsert = await planParticipantStatusUpsert(args);
			let statusId: string;
			if (upsert.existingId !== undefined) {
				await assertCanUpdateParticipantStatus({ ctx, id: upsert.existingId });
				statusId = await updateStatus({ id: upsert.existingId, values: upsert.values });
			} else {
				await assertCanCreateParticipantStatus({
					ctx,
					conferenceId: args.conferenceId,
					userId: upsert.userId
				});
				statusId = await createStatus({
					values: upsert.values,
					conferenceId: args.conferenceId,
					userId: upsert.userId
				});
			}

			scheduleEmailSweep({ conferenceId: args.conferenceId, origin: ctx.requestUrl().origin });

			return db.query.conferenceParticipant
				.findFirst(
					query(
						(await ctx.abilities.conferenceParticipant.filter('read')).merge({
							where: { id: statusId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	setParticipantSchool: t.drizzleField({
		description:
			"Sets a person's school in a conference: the only school a person taking part has, which the seats and numbers per school count, and which the assignment never changes. Without `id` it is the caller's own (as a delegate, single participant or supervisor); with it, participant care correcting somebody's. Both school arguments null removes it.",
		type: ConferenceParticipantRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			id: t.arg.id(),
			schoolId: t.arg.id(),
			schoolName: t.arg.string().validate(schoolNameSchema)
		},
		resolve: async (query, _root, args, ctx) => {
			const { participantId } = await assertCanSetParticipantSchool({ ctx, args });
			await setParticipantSchool({
				tx: db,
				participantIds: [participantId],
				schoolId: await resolveSchoolChoice({ choice: args })
			});

			return db.query.conferenceParticipant
				.findFirst(
					query(
						(await ctx.abilities.conferenceParticipant.filter('read')).merge({
							where: { id: participantId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateAllConferenceParticipants: t.field({
		description: 'Bulk attendance toggle across a whole conference, for its participant care.',
		type: BulkStatusUpdateResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			didAttend: t.arg.boolean()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanSetAttendanceForAll({ ctx, conferenceId: args.conferenceId });
			const changed = await setAttendanceForAll(args);

			scheduleEmailSweep({ conferenceId: args.conferenceId, origin: ctx.requestUrl().origin });

			return { changed };
		}
	})
}));
