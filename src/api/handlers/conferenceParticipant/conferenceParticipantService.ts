import { ofAgeAtConference } from '#lib/helpers/ageChecker';
import { type Transaction, db, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { and, eq, inArray, max, or } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';
import { conferenceParticipantPubsub } from '#api/pubsub';
import { resolveSchoolChoice, type SchoolChoice } from '#api/handlers/school/schoolService';
import type { ParticipantStatusTarget } from './conferenceParticipantPermissions';

/**
 * The person's row in the conference, created the first time they register there (as delegate,
 * single participant or supervisor) and returned on every later call. The no-op `set` is how
 * Postgres returns the existing row on conflict. Returns its id.
 */
export async function ensureConferenceParticipant({
	tx,
	conferenceId,
	userId
}: {
	tx: Transaction | typeof db;
	conferenceId: string;
	userId: string;
}) {
	const row = await tx
		.insert(schema.conferenceParticipant)
		.values({ userId, conferenceId })
		.onConflictDoUpdate({
			target: [schema.conferenceParticipant.userId, schema.conferenceParticipant.conferenceId],
			set: { userId }
		})
		.returning({ id: schema.conferenceParticipant.id })
		.then(assertFirstEntryExists);
	// The row may be new.
	conferenceParticipantPubsub.created();
	conferenceParticipantPubsub.updated(row.id);
	return row.id;
}

/**
 * Sets the school of the given people (`conferenceParticipant.schoolId`, the only school a person
 * taking part has): what they applied with, or a change. `undefined` leaves it as it is, `null`
 * removes it.
 */
export async function setParticipantSchool({
	tx,
	participantIds,
	schoolId
}: {
	tx: Transaction | typeof db;
	participantIds: readonly string[];
	schoolId: string | null | undefined;
}) {
	if (schoolId === undefined || participantIds.length === 0) return;
	await tx
		.update(schema.conferenceParticipant)
		.set({ schoolId })
		.where(
			whereRows({
				table: schema.conferenceParticipant,
				filter: { id: { in: [...participantIds] } }
			})
		);
	conferenceParticipantPubsub.updated([...participantIds]);
}

/**
 * Sets the school of one person's participant row, which the caller may change
 * (`assertCanSetParticipantSchool`): an existing school, one found or created by name, or none.
 * Both left out changes nothing.
 */
export async function changeParticipantSchool({
	participantId,
	school
}: {
	participantId: string;
	school: SchoolChoice;
}) {
	await db.transaction(async (tx) =>
		setParticipantSchool({
			tx,
			participantIds: [participantId],
			schoolId: await resolveSchoolChoice({ choice: school, tx })
		})
	);
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
		.where(
			whereRows({
				table: schema.conferenceParticipant,
				filter: { conferenceId: args.conferenceId }
			})
		);
	return (highest?.value ?? 0) + 1;
}

export type StatusUpdateArgs = {
	termsAndConditions?:
		(typeof schema.conferenceParticipant.$inferInsert)['termsAndConditions'] | null;
	guardianConsent?: (typeof schema.conferenceParticipant.$inferInsert)['guardianConsent'] | null;
	mediaConsent?: (typeof schema.conferenceParticipant.$inferInsert)['mediaConsent'] | null;
	mediaConsentStatus?:
		(typeof schema.conferenceParticipant.$inferInsert)['mediaConsentStatus'] | null;
	paymentStatus?: (typeof schema.conferenceParticipant.$inferInsert)['paymentStatus'] | null;
	didAttend?: boolean | null;
	assignedDocumentNumber?: number | null;
	assignNextDocumentNumber?: boolean | null;
	accessCardId?: string | null;
};

/** Refuses an access card another participant of the conference already carries. */
async function assertAccessCardFree({
	conferenceId,
	accessCardId,
	ownId
}: {
	conferenceId: string;
	accessCardId: string;
	ownId: string | undefined;
}) {
	const holder = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId, accessCardId, ...(ownId ? { id: { ne: ownId } } : {}) },
		columns: { id: true }
	});
	if (holder) throw apiError({ code: 'CONFLICT', message: m.accessCardTaken() });
}

/** The plain status fields to write; `null` keeps a field, like leaving it out. */
function statusFields(args: StatusUpdateArgs) {
	return {
		termsAndConditions: args.termsAndConditions ?? undefined,
		guardianConsent: args.guardianConsent ?? undefined,
		mediaConsent: args.mediaConsent ?? undefined,
		mediaConsentStatus: args.mediaConsentStatus ?? undefined,
		paymentStatus: args.paymentStatus ?? undefined,
		didAttend: args.didAttend ?? undefined
	};
}

/**
 * Writes the given fields of a participant's status where `assertCanUpsertParticipantStatus`
 * pointed: the existing row, or a new one for the user. Left out and `null` both keep a field.
 * Refuses (CONFLICT) an access card another participant of the conference carries. Returns the
 * row's id.
 */
export async function upsertParticipantStatus({
	conferenceId,
	target,
	args
}: {
	conferenceId: string;
	target: ParticipantStatusTarget;
	args: StatusUpdateArgs;
}) {
	const existingId = 'existingId' in target ? target.existingId : undefined;
	const accessCardId = args.accessCardId ?? undefined;
	if (accessCardId) await assertAccessCardFree({ conferenceId, accessCardId, ownId: existingId });

	const values = {
		...statusFields(args),
		assignedDocumentNumber: await documentNumberOf({ conferenceId, ...args }),
		accessCardId
	};

	if ('existingId' in target) {
		await db
			.update(schema.conferenceParticipant)
			.set({ ...values, updatedAt: new Date() })
			.where(whereRows({ table: schema.conferenceParticipant, filter: { id: target.existingId } }));
		conferenceParticipantPubsub.updated(target.existingId);
		return target.existingId;
	}
	const created = await db
		.insert(schema.conferenceParticipant)
		.values({ ...values, userId: target.userId, conferenceId })
		.returning({ id: schema.conferenceParticipant.id })
		.then(assertFirstEntryExists);
	conferenceParticipantPubsub.created();
	conferenceParticipantPubsub.updated(created.id);
	return created.id;
}

/**
 * Sets whether everybody registered in the conference attended, in one statement. A registration
 * points at its participant row, so everybody registered has one already. Answers how many
 * participants it touched.
 */
export async function setAttendanceForAll(args: {
	conferenceId: string;
	didAttend?: boolean | null;
}) {
	const p = schema.conferenceParticipant;
	const registered = or(
		inArray(
			p.id,
			db
				.select({ id: schema.delegationMember.conferenceParticipantId })
				.from(schema.delegationMember)
		),
		inArray(
			p.id,
			db
				.select({ id: schema.singleParticipant.conferenceParticipantId })
				.from(schema.singleParticipant)
		),
		inArray(
			p.id,
			db
				.select({ id: schema.conferenceSupervisor.conferenceParticipantId })
				.from(schema.conferenceSupervisor)
		)
	);

	const changed = await db
		.update(p)
		.set({ didAttend: args.didAttend ?? undefined, updatedAt: new Date() })
		.where(and(eq(p.conferenceId, args.conferenceId), registered))
		.returning({ id: p.id });
	if (changed.length > 0) conferenceParticipantPubsub.updated(changed.map((row) => row.id));

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
	return ofAgeAtConference({
		startConference: participant?.conference.startConference,
		dateOfBirth: participant?.user.birthday
	});
}
