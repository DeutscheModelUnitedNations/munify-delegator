import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	changeParticipantSchool,
	isOfAgeAtConference,
	setAttendanceForAll,
	upsertParticipantStatus
} from './conferenceParticipantService';
import { ScanIssueEnum } from '#api/handlers/scanLookup/scanLookup';
import { participantCheckIssues } from '#api/handlers/scanLookup/scanLookupService';
import { schoolNameSchema } from '#lib/schemata/schoolChoice';
import {
	assertCanSetAttendanceForAll,
	assertCanSetParticipantSchool,
	assertCanUpsertParticipantStatus,
	registerConferenceParticipantAbilities
} from './conferenceParticipantPermissions';

registerConferenceParticipantAbilities();

/** The participant row `id` as far as the caller may read it, for a `drizzleField` to answer with. */
async function readableParticipant({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.conferenceParticipant.filter('read')).merge({ where: { id } }).query
		.single;
}

const ConferenceParticipantRef = object({
	table: 'conferenceParticipant',
	adjust: (t) => ({
		ofAgeAtConference: t.field({
			description:
				'18 by the start of the conference, so no guardian has to consent; see `isOfAgeAtConference`.',
			type: 'Boolean',
			resolve: (participant) => isOfAgeAtConference(participant.id)
		}),
		checkIssues: t.field({
			description:
				'What the entrance check finds open for the person, without any scanner session: what their check-in page shows.',
			type: [ScanIssueEnum],
			resolve: (participant) =>
				participantCheckIssues({
					conferenceId: participant.conferenceId,
					userId: participant.userId
				})
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
			"Writes the given fields of a person's status in a conference (participant care); fields left out or `null` stay as they are. The row is addressed by id, or by conference plus user id or email: a person without a row gets one if they take part in the conference or are on its team. An unknown email answers NOT_FOUND, an access card another participant carries CONFLICT.",
		type: ConferenceParticipantRef,
		args: {
			id: t.arg.id(),
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id(),
			userEmail: t.arg({ type: 'EmailAddress' }),
			termsAndConditions: t.arg({ type: administrativeStatusEnum }),
			guardianConsent: t.arg({ type: administrativeStatusEnum }),
			mediaConsent: t.arg({ type: administrativeStatusEnum }),
			mediaConsentStatus: t.arg({ type: mediaConsentStatusEnum }),
			paymentStatus: t.arg({ type: administrativeStatusEnum }),
			didAttend: t.arg.boolean(),
			assignedDocumentNumber: t.arg.int(),
			assignNextDocumentNumber: t.arg.boolean({
				description:
					'Gives the person the number after the highest one in the conference, instead of `assignedDocumentNumber`.'
			}),
			accessCardId: t.arg.string()
		},
		resolve: async (query, _root, { id, conferenceId, userId, userEmail, ...status }, ctx) => {
			const target = await assertCanUpsertParticipantStatus({
				ctx,
				args: { id, conferenceId, userId, userEmail }
			});
			const statusId = await upsertParticipantStatus({ conferenceId, target, args: status });

			return db.query.conferenceParticipant
				.findFirst(query(await readableParticipant({ ctx, id: statusId })))
				.then(assertFindFirstExists);
		}
	}),

	setParticipantSchool: t.drizzleField({
		description:
			"Sets a person's school in a conference: the only school a person taking part has, which the seats and numbers per school count, and which the assignment never changes. Without `id` it is the caller's own (as a delegate, single participant or supervisor); with it, participant care correcting somebody's. Both school arguments null removes it, both left out keeps it.",
		type: ConferenceParticipantRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			id: t.arg.id({ description: "The participant row; left out for the caller's own." }),
			schoolId: t.arg.id({ description: 'An existing school.' }),
			schoolName: t.arg
				.string({
					description: 'The name of a school to find (ignoring case and spacing) or create.'
				})
				.validate(schoolNameSchema)
		},
		resolve: async (query, _root, args, ctx) => {
			const { participantId } = await assertCanSetParticipantSchool({ ctx, args });
			await changeParticipantSchool({
				participantId,
				school: { schoolId: args.schoolId, schoolName: args.schoolName }
			});

			return db.query.conferenceParticipant
				.findFirst(query(await readableParticipant({ ctx, id: participantId })))
				.then(assertFindFirstExists);
		}
	}),

	updateAllConferenceParticipants: t.field({
		description:
			'Sets whether everybody registered in the conference attended (participant care), creating the participant rows that are missing.',
		type: BulkStatusUpdateResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			didAttend: t.arg.boolean()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanSetAttendanceForAll({ ctx, conferenceId: args.conferenceId });
			const changed = await setAttendanceForAll(args);

			return { changed };
		}
	})
}));
