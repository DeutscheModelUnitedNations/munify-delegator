import { z } from 'zod';
import { randomInt } from 'node:crypto';
import { type Transaction, db, schema } from '#api/db/db';
import { assertFindFirstExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import {
	conferenceParticipantPubsub,
	paymentTransactionPubsub,
	userReferenceInPaymentTransactionPubsub
} from '#api/pubsub';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

type AdministrativeStatus = (typeof schema.administrativeStatus.enumValues)[number];

/** Whom a new payment covers: somebody, or it would be a reference for nothing. */
export const paymentForSchema = z
	.array(z.string())
	.min(1, { error: () => m.paymentCoversNobody() });

/**
 * Payment reference ids are printed on transfer forms, so they avoid characters that are easy to
 * misread and are grouped in fours. Same alphabet and shape as the legacy generator.
 */
function generateSEPASafeId() {
	const chars = 'ACDEFHJKMNPRTUVWXY3479';
	const length = 16;
	let id = '';
	for (let i = 0; i < length; i++) {
		id += chars[randomInt(chars.length)];
		if (i % 4 === 3 && i !== length - 1) {
			id += '-';
		}
	}
	return id;
}

/**
 * Refuses a reference that involves somebody whose fee is already paid: once paid, a person
 * makes no new references and is covered by nobody else's. Locks their status rows, so a payment
 * marked received at the same moment cannot slip past.
 */
async function assertNobodyPaid({
	tx,
	participantIds
}: {
	tx: Transaction;
	participantIds: readonly string[];
}) {
	const paid = await tx
		.select({ id: schema.conferenceParticipant.id })
		.from(schema.conferenceParticipant)
		.where(
			whereRows({
				table: schema.conferenceParticipant,
				filter: {
					id: { in: [...new Set(participantIds)] },
					paymentStatus: 'DONE'
				}
			})
		)
		.for('update');
	if (paid.length > 0) {
		throw apiError({ code: 'CONFLICT', message: m.paymentAlreadyPaid() });
	}
}

/**
 * A reference id no payment has yet. With 22^16 possible ids a clash is all but impossible, so a
 * few tries are plenty; running out of them is a fault, not something the caller did.
 */
async function freePaymentId() {
	for (let attempt = 0; attempt < 10; attempt++) {
		const id = generateSEPASafeId();
		const clash = await db.query.paymentTransaction.findFirst({
			where: { id },
			columns: { id: true }
		});
		if (!clash) return id;
	}
	throw new Error('No free payment reference id found');
}

/**
 * Records a payment reference paid by the participant `payerParticipantId` for the participants
 * `paymentFor` (participant row ids), at the conference's fee per participant. Refuses
 * (INVALID_INPUT) while the conference has no fee, and (CONFLICT) when somebody involved has paid
 * already (`assertNobodyPaid`). Returns the new reference's id.
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

	const id = await freePaymentId();

	await db.transaction(async (tx) => {
		await assertNobodyPaid({ tx, participantIds: [payerParticipantId, ...paymentFor] });
		await tx.insert(schema.paymentTransaction).values({
			id,
			amount: paymentFor.length * feeAmount,
			payerParticipantId
		});
		if (paymentFor.length > 0) {
			await tx.insert(schema.userReferenceInPaymentTransaction).values(
				paymentFor.map((conferenceParticipantId) => ({
					paymentTransactionId: id,
					conferenceParticipantId
				}))
			);
		}
	});
	paymentTransactionPubsub.created();
	if (paymentFor.length > 0) userReferenceInPaymentTransactionPubsub.created();

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
