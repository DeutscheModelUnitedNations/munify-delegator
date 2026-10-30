import { ofAgeAtConference } from '#lib/helpers/ageChecker';
import { type Transaction, db, schema } from '#api/db/db';
import { nullToUndefined } from '#api/services/args';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { max } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

/**
 * The person's row in the conference, created the first time they register there (as delegate,
 * single participant or supervisor) and returned on every later call. The no-op `set` is how
 * Postgres returns the existing row on conflict. Returns its id.
 */
export async function ensureConferenceParticipant(
	tx: Transaction | typeof db,
	conferenceId: string,
	userId: string
) {
	const row = await tx
		.insert(schema.conferenceParticipant)
		.values({ userId, conferenceId })
		.onConflictDoUpdate({
			target: [schema.conferenceParticipant.userId, schema.conferenceParticipant.conferenceId],
			set: { userId }
		})
		.returning({ id: schema.conferenceParticipant.id })
		.then(assertFirstEntryExists);
	return row.id;
}

/**
 * Sets the school of the given people (`conferenceParticipant.schoolId`, the only school a person
 * taking part has): what they applied with, or a change. `undefined` leaves it as it is, `null`
 * removes it.
 */
export async function setParticipantSchool(
	tx: Transaction | typeof db,
	participantIds: readonly string[],
	schoolId: string | null | undefined
) {
	if (schoolId === undefined || participantIds.length === 0) return;
	await tx
		.update(schema.conferenceParticipant)
		.set({ schoolId })
		.where(whereRows(schema.conferenceParticipant, { id: { in: [...participantIds] } }));
}

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
		.select({ value: max(schema.conferenceParticipant.assignedDocumentNumber) })
		.from(schema.conferenceParticipant)
		.where(whereRows(schema.conferenceParticipant, { conferenceId: args.conferenceId }));
	return (highest?.value ?? 0) + 1;
}

type StatusValues = Partial<typeof schema.conferenceParticipant.$inferInsert>;

/**
 * Updates the status row `id`; whether the caller may is checked before
 * (`assertCanUpdateParticipantStatus`).
 */
export async function updateStatus(id: string, values: StatusValues) {
	const [updated] = await db
		.update(schema.conferenceParticipant)
		.set(values)
		.where(whereRows(schema.conferenceParticipant, { id }))
		.returning({ id: schema.conferenceParticipant.id });
	if (!updated) {
		throw apiError('NOT_FOUND', m.updateNotFoundOrForbidden());
	}
	return updated.id;
}

/**
 * Creates a status row; whether the caller may, for this user, is checked before
 * (`assertCanCreateParticipantStatus`).
 */
export async function createStatus(values: StatusValues, conferenceId: string, userId: string) {
	const created = await db
		.insert(schema.conferenceParticipant)
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

/** Refuses an access card another participant of the conference already carries. */
async function assertAccessCardFree(
	conferenceId: string,
	accessCardId: string,
	ownId: string | undefined
) {
	const holder = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId, accessCardId, ...(ownId ? { id: { ne: ownId } } : {}) },
		columns: { id: true }
	});
	if (holder) throw apiError('CONFLICT', m.accessCardTaken());
}

/**
 * Works out what upserting a participant's status writes: the values, and either the existing row
 * to update or the user to create one for. The row is addressed either by id, or by conference
 * plus user id, or by conference plus user email. Whether the caller may write there is checked
 * before this runs (`assertCanUpsertParticipantStatus`): the lookups answer who has an account and
 * which card is in use, which only the conference's participant care may learn.
 */
export async function planParticipantStatusUpsert(
	args: StatusUpdateArgs
): Promise<
	{ values: StatusValues } & ({ existingId: string } | { existingId?: undefined; userId: string })
> {
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

	const existing = await db.query.conferenceParticipant.findFirst({
		where: args.id ? { id: args.id } : { conferenceId: args.conferenceId, userId: targetUserId }
	});

	if (values.accessCardId) {
		await assertAccessCardFree(args.conferenceId, values.accessCardId, existing?.id);
	}

	if (existing) return { values, existingId: existing.id };
	if (!targetUserId) {
		throw apiError('INVALID_INPUT', m.participantStatusNeedsUser());
	}
	return { values, userId: targetUserId };
}

/** Bulk attendance toggle across a whole conference; answers how many participants it touched. */
export async function setAttendanceForAll(args: {
	conferenceId: string;
	didAttend?: boolean | null;
}) {
	const participants = await db.query.user.findMany({
		where: {
			OR: [
				{ conferenceSupervisor: { participant: { conferenceId: args.conferenceId } } },
				{ singleParticipant: { participant: { conferenceId: args.conferenceId } } },
				{ delegationMemberships: { participant: { conferenceId: args.conferenceId } } }
			]
		},
		columns: { id: true }
	});

	const changed: string[] = [];
	await db.transaction(async (tx) => {
		for (const participant of participants) {
			const row = await tx
				.insert(schema.conferenceParticipant)
				.values({
					userId: participant.id,
					conferenceId: args.conferenceId,
					didAttend: args.didAttend ?? undefined
				})
				.onConflictDoUpdate({
					target: [schema.conferenceParticipant.userId, schema.conferenceParticipant.conferenceId],
					set: { didAttend: args.didAttend ?? undefined }
				})
				.returning({ id: schema.conferenceParticipant.id })
				.then(assertFirstEntryExists);
			changed.push(row.id);
		}
	});

	return changed.length;
}

/**
 * Whether the person is 18 by the start of the conference: what decides if a guardian has to
 * consent. Answered as a flag, so the people who see someone's paperwork (their co-delegates, for
 * one) learn whether a guardian is involved, not the birthday.
 */
export async function isOfAgeAtConference(participantId: string) {
	const participant = await db.query.conferenceParticipant.findFirst({
		where: { id: participantId },
		columns: {},
		with: {
			user: { columns: { birthday: true } },
			conference: { columns: { startConference: true } }
		}
	});
	return ofAgeAtConference(participant?.conference.startConference, participant?.user.birthday);
}
