import { db, schema } from '$api/db/db';
import { abilityBuilder, enum_, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isOwnUser,
	isTeamMemberOfConference,
	isSystemAdmin,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { eq, max } from 'drizzle-orm';

// Ported from abilities/entities/conferenceParticipantStatus.ts
abilityBuilder.conferenceParticipantStatus.allow(['read', 'update', 'delete']).when(systemAdmin);

// Users see their own status.
abilityBuilder.conferenceParticipantStatus.allow('read').when((ctx) => {
	const where = isOwnUser(ctx);
	return where ? { where } : undefined;
});

// Supervisors see the status of the participants they supervise.
// Carried over with the original caveat: this is not scoped to a single conference.
abilityBuilder.conferenceParticipantStatus.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
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
abilityBuilder.conferenceParticipantStatus.allow(['read', 'update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return where ? { where } : undefined;
});

export const ConferenceParticipantStatusRef = object({ table: 'conferenceParticipantStatus' });
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
			if (!args.id && !args.userId && !args.userEmail) {
				throw new GraphQLError(
					'You must provide either an id, a userId and conferenceId or a userEmail and conferenceId'
				);
			}

			let targetUserId = args.userId ?? undefined;
			if (!targetUserId && args.userEmail) {
				const found = await db.query.user
					.findFirst({ where: { email: args.userEmail } })
					.then(assertFindFirstExists);
				targetUserId = found.id;
			}

			// "Assign the next free number" is resolved per conference, as in the legacy resolver.
			let documentNumber = args.assignedDocumentNumber ?? undefined;
			if (args.assignNextDocumentNumber) {
				const [highest] = await db
					.select({ value: max(schema.conferenceParticipantStatus.assigendDocumentNumber) })
					.from(schema.conferenceParticipantStatus)
					.where(eq(schema.conferenceParticipantStatus.conferenceId, args.conferenceId));
				documentNumber = (highest?.value ?? 0) + 1;
			}

			const values = {
				termsAndConditions: args.termsAndConditions ?? undefined,
				guardianConsent: args.guardianConsent ?? undefined,
				mediaConsent: args.mediaConsent ?? undefined,
				mediaConsentStatus: args.mediaConsentStatus ?? undefined,
				paymentStatus: args.paymentStatus ?? undefined,
				didAttend: args.didAttend ?? undefined,
				assigendDocumentNumber: documentNumber,
				accessCardId: args.accessCardId ?? undefined
			};

			const existing = await db.query.conferenceParticipantStatus.findFirst({
				where: args.id ? { id: args.id } : { conferenceId: args.conferenceId, userId: targetUserId }
			});

			let statusId: string;
			if (existing) {
				const updatable = ctx.abilities.conferenceParticipantStatus
					.filter('update')
					.merge({ where: { id: existing.id } });
				const [updated] = await db
					.update(schema.conferenceParticipantStatus)
					.set(values)
					.where(updatable.sql.where)
					.returning({ id: schema.conferenceParticipantStatus.id });
				if (!updated) {
					throw new GraphQLError('Participant status not found, or not yours to update');
				}
				statusId = updated.id;
			} else {
				if (!targetUserId) {
					throw new GraphQLError('A userId or userEmail is required to create a status');
				}
				const created = await db
					.insert(schema.conferenceParticipantStatus)
					.values({ ...values, userId: targetUserId, conferenceId: args.conferenceId })
					.returning()
					.then(assertFirstEntryExists);
				statusId = created.id;
			}

			return db.query.conferenceParticipantStatus
				.findFirst(
					query(
						ctx.abilities.conferenceParticipantStatus
							.filter('read')
							.merge({ where: { id: statusId } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** Bulk attendance toggle across a whole conference. Admin only, as before. */
	updateAllConferenceParticipantStatus: t.field({
		type: ['String'],
		args: {
			conferenceId: t.arg.id({ required: true }),
			didAttend: t.arg.boolean()
		},
		resolve: async (_root, args, ctx) => {
			if (!isSystemAdmin(ctx)) {
				throw new GraphQLError(
					'You do not have permission to update all conference participant status'
				);
			}

			const participants = await db.query.user.findMany({
				where: {
					OR: [
						{ conferenceSupervisor: { conferenceId: args.conferenceId } },
						{ singleParticipant: { conferenceId: args.conferenceId } },
						{ delegationMemberships: { conferenceId: args.conferenceId } }
					]
				},
				columns: { id: true }
			});

			const changed: string[] = [];
			await db.transaction(async (tx) => {
				for (const participant of participants) {
					const row = await tx
						.insert(schema.conferenceParticipantStatus)
						.values({
							userId: participant.id,
							conferenceId: args.conferenceId,
							didAttend: args.didAttend ?? undefined
						})
						.onConflictDoUpdate({
							target: [
								schema.conferenceParticipantStatus.userId,
								schema.conferenceParticipantStatus.conferenceId
							],
							set: { didAttend: args.didAttend ?? undefined }
						})
						.returning({ id: schema.conferenceParticipantStatus.id })
						.then(assertFirstEntryExists);
					changed.push(row.id);
				}
			});

			return changed;
		}
	}),

	deleteConferenceParticipantStatus: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.conferenceParticipantStatus)
				.where(
					ctx.abilities.conferenceParticipantStatus
						.filter('delete')
						.merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.conferenceParticipantStatus.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Participant status not found, or not yours to delete');
			}
			return true;
		}
	})
}));
