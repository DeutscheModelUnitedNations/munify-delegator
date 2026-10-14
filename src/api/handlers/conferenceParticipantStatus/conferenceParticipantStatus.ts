import { db } from '$api/db/db';
import { abilityBuilder, enum_, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';
import { setAttendanceForAll, upsertParticipantStatus } from './conferenceParticipantStatusService';
import { conferenceParticipantStatusPubsub } from '$api/pubsub';

// Ported from abilities/entities/conferenceParticipantStatus.ts
abilityBuilder.conferenceParticipantStatus.allow(['read', 'update', 'delete']).when(systemAdmin);

// Users see their own status.
abilityBuilder.conferenceParticipantStatus.allow('read').when((ctx) => where(isOwnUser(ctx)));

// Supervisors see the status of the participants they supervise, in the conference they supervise
// them in.
abilityBuilder.conferenceParticipantStatus.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					conference: { conferenceSupervisors: { user: { id } } },
					user: {
						OR: [
							{ delegationMemberships: { supervisors: { user: { id } } } },
							{ singleParticipant: { supervisors: { user: { id } } } }
						]
					}
				}
			}
		: undefined;
});

// Delegation members see the status of their co-delegates.
abilityBuilder.conferenceParticipantStatus.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					user: { delegationMemberships: { delegation: { members: { user: { id } } } } }
				}
			}
		: undefined;
});

// Participant care and project management manage their conference's statuses.
abilityBuilder.conferenceParticipantStatus
	.allow(['read', 'update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

const ConferenceParticipantStatusRef = object({ table: 'conferenceParticipantStatus' });

const BulkStatusUpdateResult = schemaBuilder.simpleObject(
	'UpdateAllConferenceParticipantStatusResponse',
	{
		fields: (t) => ({
			/** How many participants the bulk update touched. */
			changed: t.int()
		})
	}
);
query({ table: 'conferenceParticipantStatus' });

const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });
const mediaConsentStatusEnum = enum_({ tsName: 'mediaConsentStatus' });

schemaBuilder.mutationFields((t) => ({
	/**
	 * Upserts a participant's status. The row is addressed either by id, or by conference plus
	 * user id, or by conference plus user email - the management UI knows different things in
	 * different places, which is why all three are accepted.
	 */
	updateConferenceParticipantStatus: t.drizzleField({
		type: ConferenceParticipantStatusRef,
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
			const statusId = await upsertParticipantStatus(ctx, args);

			// Updated or created on the spot, so one notification on whichever row now holds it.
			conferenceParticipantStatusPubsub.updated(statusId);

			return db.query.conferenceParticipantStatus
				.findFirst(
					query(
						(await ctx.abilities.conferenceParticipantStatus.filter('read')).merge({
							where: { id: statusId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** Bulk attendance toggle across a whole conference, for its participant care. */
	updateAllConferenceParticipantStatus: t.field({
		type: BulkStatusUpdateResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			didAttend: t.arg.boolean()
		},
		resolve: async (_root, args, ctx) => {
			const changed = await setAttendanceForAll(ctx, args);

			conferenceParticipantStatusPubsub.created();

			return { changed };
		}
	})
}));
