import { db, schema } from '$api/db/db';
import type { Insert } from '$api/db/rows';
import {
	abilityBuilder,
	enum_,
	object,
	pubsub as rumblePubsub,
	query,
	schemaBuilder
} from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isOwnUser,
	isTeamMemberOfConference,
	isSystemAdmin,
	participatesIn,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { type SQL, eq, max } from 'drizzle-orm';
import type { Context } from '$api/context';
import { nullToUndefined } from '$api/services/args';

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
const pubsub = rumblePubsub({ table: 'conferenceParticipantStatus' });

const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });
const mediaConsentStatusEnum = enum_({ tsName: 'mediaConsentStatus' });

/** The user a status is addressed to, when it is addressed by user id or email. */
async function targetUserIdOf(args: { userId?: string | null; userEmail?: string | null }) {
	if (args.userId) return args.userId;
	if (!args.userEmail) return undefined;
	const found = await db.query.user
		.findFirst({ where: { email: args.userEmail } })
		.then(assertFindFirstExists);
	return found.id;
}

/** "Assign the next free number" is resolved per conference, as in the legacy resolver. */
async function documentNumberOf(args: {
	conferenceId: string;
	assignedDocumentNumber?: number | null;
	assignNextDocumentNumber?: boolean | null;
}) {
	if (!args.assignNextDocumentNumber) return args.assignedDocumentNumber ?? undefined;
	const [highest] = await db
		.select({ value: max(schema.conferenceParticipantStatus.assignedDocumentNumber) })
		.from(schema.conferenceParticipantStatus)
		.where(eq(schema.conferenceParticipantStatus.conferenceId, args.conferenceId));
	return (highest?.value ?? 0) + 1;
}

type StatusValues = Partial<Insert<'conferenceParticipantStatus'>>;

/** Updates the status row the caller's `update` ability narrowed down to. */
async function updateStatus(updatable: SQL | undefined, values: StatusValues) {
	const [updated] = await db
		.update(schema.conferenceParticipantStatus)
		.set(values)
		.where(updatable)
		.returning({ id: schema.conferenceParticipantStatus.id });
	if (!updated) {
		throw new GraphQLError('Participant status not found, or not yours to update');
	}
	return updated.id;
}

/**
 * Creates a status row. There is no row for the update ability to judge yet, so this is the
 * conference's participant care asking, for somebody who actually belongs to the conference.
 */
async function createStatus(
	ctx: Context,
	values: StatusValues,
	conferenceId: string,
	userId: string | undefined
) {
	if (!userId) {
		throw new GraphQLError('A userId or userEmail is required to create a status');
	}
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
	const member = await db.query.user.findFirst({
		where: {
			id: userId,
			OR: [...participatesIn({ id: conferenceId }).OR, { teamMember: { conferenceId } }]
		},
		columns: { id: true }
	});
	if (!member) {
		throw new GraphQLError('This user does not take part in the conference');
	}
	const created = await db
		.insert(schema.conferenceParticipantStatus)
		.values({ ...values, userId, conferenceId })
		.returning()
		.then(assertFirstEntryExists);
	return created.id;
}

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

			const targetUserId = await targetUserIdOf(args);
			const documentNumber = await documentNumberOf(args);

			const values = {
				termsAndConditions: nullToUndefined(args.termsAndConditions),
				guardianConsent: nullToUndefined(args.guardianConsent),
				mediaConsent: nullToUndefined(args.mediaConsent),
				mediaConsentStatus: nullToUndefined(args.mediaConsentStatus),
				paymentStatus: nullToUndefined(args.paymentStatus),
				didAttend: nullToUndefined(args.didAttend),
				assignedDocumentNumber: documentNumber,
				accessCardId: nullToUndefined(args.accessCardId)
			};

			const existing = await db.query.conferenceParticipantStatus.findFirst({
				where: args.id ? { id: args.id } : { conferenceId: args.conferenceId, userId: targetUserId }
			});

			const statusId = existing
				? await updateStatus(
						(await ctx.abilities.conferenceParticipantStatus.filter('update')).merge({
							where: { id: existing.id }
						}).sql.where,
						values
					)
				: await createStatus(ctx, values, args.conferenceId, targetUserId);

			// Updated or created on the spot, so one notification on whichever row now holds it.
			pubsub.updated(statusId);

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

	/** Bulk attendance toggle across a whole conference. Admin only, as before. */
	updateAllConferenceParticipantStatus: t.field({
		type: BulkStatusUpdateResult,
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

			pubsub.created();

			return { changed: changed.length };
		}
	}),

	deleteConferenceParticipantStatus: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.conferenceParticipantStatus)
				.where(
					(await ctx.abilities.conferenceParticipantStatus.filter('delete')).merge({
						where: { id: args.id }
					}).sql.where
				)
				.returning({ id: schema.conferenceParticipantStatus.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Participant status not found, or not yours to delete');
			}
			pubsub.removed();

			return true;
		}
	})
}));
