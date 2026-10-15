import { db } from '$api/db/db';
import { enum_, object, query, schemaBuilder } from '$api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	createStatus,
	planParticipantStatusUpsert,
	setAttendanceForAll,
	updateStatus
} from './conferenceParticipantService';
import {
	assertCanCreateParticipantStatus,
	assertCanSetAttendanceForAll,
	assertCanUpdateParticipantStatus,
	registerConferenceParticipantAbilities
} from './conferenceParticipantPermissions';
import { conferenceParticipantPubsub } from '$api/pubsub';

registerConferenceParticipantAbilities();

const ConferenceParticipantRef = object({ table: 'conferenceParticipant' });

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

			return { changed };
		}
	})
}));
