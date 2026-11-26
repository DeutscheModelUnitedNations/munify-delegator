import { z } from 'zod';
import { randomInt } from 'node:crypto';
import { type Transaction, db, schema } from '#api/db/db';
import { assertFindFirstExists } from '@m1212e/rumble';
import { asc } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import {
	conferenceParticipantPubsub,
	paymentTransactionPubsub,
	userReferenceInPaymentTransactionPubsub
} from '#api/pubsub';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';
import {
	PAYMENT_REFERENCE_ALPHABET,
	PAYMENT_REFERENCE_LENGTH,
	formatPaymentReference
} from './paymentReference';

export type AdministrativeStatus = (typeof schema.administrativeStatus.enumValues)[number];

/** Whom a new payment covers: somebody, or it would be a reference for nothing. */
export const paymentForSchema = z
	.array(z.string())
	.min(1, { error: () => m.paymentCoversNobody() });

/** A new payment reference id, same alphabet and shape as the legacy generator. */
function generateSEPASafeId() {
	let chars = '';
	for (let i = 0; i < PAYMENT_REFERENCE_LENGTH; i++) {
		chars += PAYMENT_REFERENCE_ALPHABET[randomInt(PAYMENT_REFERENCE_ALPHABET.length)];
	}
	return formatPaymentReference(chars);
}

/**
 * Locks the participants' rows and reads their payment status, waiting for whoever is changing it.
 * Always in id order, so two callers locking the same people cannot block each other.
 */
function lockPaymentStatus({
	tx,
	participantIds
}: {
	tx: Transaction;
	participantIds: readonly string[];
}) {
	return tx
		.select({ paymentStatus: schema.conferenceParticipant.paymentStatus })
		.from(schema.conferenceParticipant)
		.where(
			whereRows({
				table: schema.conferenceParticipant,
				filter: { id: { in: [...new Set(participantIds)] } }
			})
		)
		.orderBy(asc(schema.conferenceParticipant.id))
		.for('no key update');
}

/**
 * Refuses a reference that involves somebody whose fee is already paid: once paid, a person
 * makes no new references and is covered by nobody else's. Keeps everybody involved locked, paid or
 * not (`lockPaymentStatus`), so a payment marked received at the same moment cannot slip past.
 */
async function assertNobodyPaid({
	tx,
	participantIds
}: {
	tx: Transaction;
	participantIds: readonly string[];
}) {
	const people = await lockPaymentStatus({ tx, participantIds });
	if (people.some((person) => person.paymentStatus === 'DONE')) {
		throw apiError({ code: 'CONFLICT', message: m.paymentAlreadyPaid() });
	}
}

/**
 * A reference id no payment has yet. With 22^16 possible ids a clash is all but impossible, so a
 * few tries are plenty; running out of them is a fault, not something the caller did.
 */
async function freePaymentId({ tx }: { tx: Transaction }) {
	for (let attempt = 0; attempt < 10; attempt++) {
		const id = generateSEPASafeId();
		const clash = await tx.query.paymentTransaction.findFirst({
			where: { id },
			columns: { id: true }
		});
		if (!clash) return id;
	}
	throw new Error('No free payment reference id found');
}

/** The first of the payments that covers exactly these participants, in whatever order. */
export function paymentCovering<
	T extends { paymentFor: readonly { conferenceParticipantId: string }[] }
>({ payments, paymentFor }: { payments: readonly T[]; paymentFor: readonly string[] }) {
	const wanted = new Set(paymentFor);
	return payments.find((payment) => {
		const covered = new Set(payment.paymentFor.map((row) => row.conferenceParticipantId));
		return covered.size === wanted.size && [...wanted].every((id) => covered.has(id));
	});
}

/**
 * The payer's reference for exactly these participants and this amount whose money has not
 * arrived, the newest should there be several. One made at another fee no longer fits, its amount
 * is the old one. Looks under the payer's lock (`assertNobodyPaid`), so the same reference asked for
 * twice at once is made once.
 */
async function openPaymentFor({
	tx,
	payerParticipantId,
	paymentFor,
	amount
}: {
	tx: Transaction;
	payerParticipantId: string;
	paymentFor: readonly string[];
	amount: number;
}) {
	const payments = await tx.query.paymentTransaction.findMany({
		where: { payerParticipantId, amount, recievedAt: { isNull: true } },
		columns: { id: true },
		with: { paymentFor: { columns: { conferenceParticipantId: true } } },
		orderBy: { createdAt: 'desc' }
	});
	return paymentCovering({ payments, paymentFor });
}

/**
 * The payment reference paid by the participant `payerParticipantId` for the participants
 * `paymentFor` (participant row ids), at the conference's fee per participant: the one the payer
 * already has (`openPaymentFor`), otherwise a new one. Refuses (INVALID_INPUT) while the
 * conference has no fee, and (CONFLICT) when somebody involved has paid already
 * (`assertNobodyPaid`). Returns the reference's id.
 */
export async function createPaymentTransaction({
	conferenceId,
	payerParticipantId,
	paymentFor
}: {
	conferenceId: string;
	payerParticipantId: string;
	paymentFor: readonly string[];
}) {
	const { feeAmount } = await db.query.conference
		.findFirst({ where: { id: conferenceId }, columns: { feeAmount: true } })
		.then(assertFindFirstExists);
	if (!feeAmount) {
		throw apiError({ code: 'INVALID_INPUT', message: m.paymentFeeNotSet() });
	}
	const amount = paymentFor.length * feeAmount;

	const { id, created } = await db.transaction(async (tx) => {
		await assertNobodyPaid({ tx, participantIds: [payerParticipantId, ...paymentFor] });

		const open = await openPaymentFor({ tx, payerParticipantId, paymentFor, amount });
		if (open) return { id: open.id, created: false };

		const id = await freePaymentId({ tx });
		await tx.insert(schema.paymentTransaction).values({ id, amount, payerParticipantId });
		if (paymentFor.length > 0) {
			await tx.insert(schema.userReferenceInPaymentTransaction).values(
				paymentFor.map((conferenceParticipantId) => ({
					paymentTransactionId: id,
					conferenceParticipantId
				}))
			);
		}
		return { id, created: true };
	});
	if (created) {
		paymentTransactionPubsub.created();
		if (paymentFor.length > 0) userReferenceInPaymentTransactionPubsub.created();
	}

	return id;
}

/**
 * Sets the status of a payment transaction: marks it received when it is `DONE`, and carries the
 * status over to everybody it covers.
 */
export async function applyPaymentStatus({
	payment,
	assignedStatus,
	recievedAt
}: {
	payment: { id: string; paymentFor: { conferenceParticipantId: string }[] };
	assignedStatus: AdministrativeStatus;
	recievedAt: Date | null | undefined;
}) {
	// The payment status is carried over to every participant the transaction covers.
	const covered = payment.paymentFor.map((reference) => reference.conferenceParticipantId);
	await db.transaction(async (tx) => {
		if (covered.length > 0) await lockPaymentStatus({ tx, participantIds: covered });
		if (assignedStatus === 'DONE') {
			await tx
				.update(schema.paymentTransaction)
				.set({ recievedAt: recievedAt ?? undefined })
				.where(whereRows({ table: schema.paymentTransaction, filter: { id: payment.id } }));
		}
		if (covered.length > 0) {
			await tx
				.update(schema.conferenceParticipant)
				.set({ paymentStatus: assignedStatus })
				.where(whereRows({ table: schema.conferenceParticipant, filter: { id: { in: covered } } }));
		}
	});
	paymentTransactionPubsub.updated(payment.id);
	if (covered.length > 0) conferenceParticipantPubsub.updated(covered);
}
