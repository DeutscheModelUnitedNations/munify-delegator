import { db, schema } from '$api/db/db';
import type { ApiContext } from '$api/rumble';
import type { Context } from '$api/context';
import { PARTICIPANT_CARE_ROLES, assertTeamRole, participatesIn } from '$api/services/authHelper';
import { nullToUndefined } from '$api/services/args';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { type SQL, eq, max } from 'drizzle-orm';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

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

type StatusValues = Partial<typeof schema.conferenceParticipantStatus.$inferInsert>;

/** Updates the status row the caller's `update` ability narrowed down to. */
async function updateStatus(updatable: SQL | undefined, values: StatusValues) {
	const [updated] = await db
		.update(schema.conferenceParticipantStatus)
		.set(values)
		.where(updatable)
		.returning({ id: schema.conferenceParticipantStatus.id });
	if (!updated) {
		throw apiError('NOT_FOUND', m.updateNotFoundOrForbidden());
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
		throw apiError('INVALID_INPUT', m.participantStatusNeedsUser());
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
		throw apiError('INVALID_INPUT', m.userNotInConference());
	}
	const created = await db
		.insert(schema.conferenceParticipantStatus)
		.values({ ...values, userId, conferenceId })
		.returning()
		.then(assertFirstEntryExists);
	return created.id;
}

export type StatusUpdateArgs = {
	id?: string | null;
	conferenceId: string;
	userId?: string | null;
	userEmail?: string | null;
	termsAndConditions?: StatusValues['termsAndConditions'] | null;
	guardianConsent?: StatusValues['guardianConsent'] | null;
	mediaConsent?: StatusValues['mediaConsent'] | null;
	mediaConsentStatus?: StatusValues['mediaConsentStatus'] | null;
	paymentStatus?: StatusValues['paymentStatus'] | null;
	didAttend?: boolean | null;
	assignedDocumentNumber?: number | null;
	assignNextDocumentNumber?: boolean | null;
	accessCardId?: string | null;
};

/**
 * Upserts a participant's status and answers the id of the row that now holds it. The row is
 * addressed either by id, or by conference plus user id, or by conference plus user email.
 */
export async function upsertParticipantStatus(ctx: ApiContext, args: StatusUpdateArgs) {
	if (!args.id && !args.userId && !args.userEmail) {
		throw apiError('INVALID_INPUT', m.participantStatusNeedsLookup());
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

	if (values.accessCardId) {
		const holder = await db.query.conferenceParticipantStatus.findFirst({
			where: {
				conferenceId: args.conferenceId,
				accessCardId: values.accessCardId,
				...(existing ? { id: { ne: existing.id } } : {})
			},
			columns: { id: true }
		});
		if (holder) {
			throw apiError('CONFLICT', m.accessCardTaken());
		}
	}

	const statusId = existing
		? await updateStatus(
				(await ctx.abilities.conferenceParticipantStatus.filter('update')).merge({
					where: { id: existing.id }
				}).sql.where,
				values
			)
		: await createStatus(ctx, values, args.conferenceId, targetUserId);

	return statusId;
}

/** Bulk attendance toggle across a whole conference; answers how many participants it touched. */
export async function setAttendanceForAll(
	ctx: ApiContext,
	args: { conferenceId: string; didAttend?: boolean | null }
) {
	await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

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

	return changed.length;
}
