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
export function lockPaymentStatus({
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
 * arrived and which they did not give up (`discardPaymentTransaction`), the newest should there be
 * several. One made at another fee no longer fits, its amount
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
		where: {
			payerParticipantId,
			amount,
			recievedAt: { isNull: true },
			discardedAt: { isNull: true }
		},
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
	const covered = await db.transaction((tx) =>
		writePaymentStatus({ tx, payment, assignedStatus, recievedAt })
	);
	paymentTransactionPubsub.updated(payment.id);
	if (covered.length > 0) conferenceParticipantPubsub.updated(covered);
}

/**
 * Who a payment whose money arrived only in part settles: `paidFor` (participant row ids) become
 * `DONE`, everybody else it covers goes back to `PENDING` to pay anew. `whole` when that is
 * everybody, so the payment counts as received. Undefined for a `paidFor` that is empty or names
 * somebody the payment does not cover.
 */
export function partialReceipt({
	covered,
	paidFor
}: {
	covered: readonly string[];
	paidFor: readonly string[];
}): { done: string[]; pending: string[]; whole: boolean } | undefined {
	const paid = new Set(paidFor);
	if (paid.size === 0 || [...paid].some((id) => !covered.includes(id))) return undefined;
	const done = covered.filter((id) => paid.has(id));
	const pending = covered.filter((id) => !paid.has(id));
	return { done, pending, whole: pending.length === 0 };
}

/**
 * Marks only some of the people a payment covers paid (`partialReceipt`), as when a transfer
 * brought less than the payment's amount: they become `DONE`, the others `PENDING`. With everybody
 * named it is `applyPaymentStatus(DONE)` and the payment is received on `recievedAt`; otherwise
 * the payment itself stays open. INVALID_INPUT for an empty selection or somebody not covered.
 */
export async function receivePaymentFor({
	payment,
	paidFor,
	recievedAt
}: {
	payment: { id: string; paymentFor: { conferenceParticipantId: string }[] };
	paidFor: readonly string[];
	recievedAt: Date | null | undefined;
}) {
	const covered = payment.paymentFor.map((reference) => reference.conferenceParticipantId);
	const receipt = partialReceipt({ covered, paidFor });
	if (!receipt) throw apiError({ code: 'INVALID_INPUT', message: m.paymentPaidForNotCovered() });
	if (receipt.whole) return applyPaymentStatus({ payment, assignedStatus: 'DONE', recievedAt });

	await db.transaction(async (tx) => {
		await lockPaymentStatus({ tx, participantIds: covered });
		await tx
			.update(schema.conferenceParticipant)
			.set({ paymentStatus: 'DONE' })
			.where(
				whereRows({ table: schema.conferenceParticipant, filter: { id: { in: receipt.done } } })
			);
		await tx
			.update(schema.conferenceParticipant)
			.set({ paymentStatus: 'PENDING' })
			.where(
				whereRows({ table: schema.conferenceParticipant, filter: { id: { in: receipt.pending } } })
			);
	});
	paymentTransactionPubsub.updated(payment.id);
	conferenceParticipantPubsub.updated(covered);
}

/**
 * `applyPaymentStatus` inside the caller's transaction `tx`: locks everybody the payment covers,
 * marks it received when `DONE` and carries the status over to them. Publishes nothing, so the
 * caller announces the payment and the returned participant row ids once `tx` has committed.
 */
export async function writePaymentStatus({
	tx,
	payment,
	assignedStatus,
	recievedAt
}: {
	tx: Transaction;
	payment: { id: string; paymentFor: { conferenceParticipantId: string }[] };
	assignedStatus: AdministrativeStatus;
	recievedAt: Date | null | undefined;
}) {
	// The payment status is carried over to every participant the transaction covers.
	const covered = payment.paymentFor.map((reference) => reference.conferenceParticipantId);
	if (covered.length > 0) await lockPaymentStatus({ tx, participantIds: covered });
	// without a date the stored one stays (`updatePaymentTransaction`'s `recievedAt` left out)
	if (assignedStatus === 'DONE' && recievedAt) {
		await tx
			.update(schema.paymentTransaction)
			.set({ recievedAt })
			.where(whereRows({ table: schema.paymentTransaction, filter: { id: payment.id } }));
	}
	if (covered.length > 0) {
		await tx
			.update(schema.conferenceParticipant)
			.set({ paymentStatus: assignedStatus })
			.where(whereRows({ table: schema.conferenceParticipant, filter: { id: { in: covered } } }));
	}
	return covered;
}

/**
 * Writes `changes` to a payment whose money has not arrived and which is not given up; refuses
 * (CONFLICT) one that has arrived or was given up, which nothing on the payer's side changes any more.
 */
async function updateOpenPayment({
	id,
	changes
}: {
	id: string;
	changes: Partial<
		Pick<typeof schema.paymentTransaction.$inferInsert, 'transferReportedAt' | 'discardedAt'>
	>;
}) {
	const payment = await db.query.paymentTransaction
		.findFirst({ where: { id }, columns: { recievedAt: true, discardedAt: true } })
		.then(assertFindFirstExists);
	const problem = openPaymentProblem(payment);
	if (problem === 'RECEIVED') {
		throw apiError({ code: 'CONFLICT', message: m.paymentAlreadyReceived() });
	}
	if (problem === 'DISCARDED') {
		throw apiError({ code: 'CONFLICT', message: m.paymentReferenceDiscarded() });
	}
	const written = await db
		.update(schema.paymentTransaction)
		.set({ ...changes, updatedAt: new Date() })
		.where(
			whereRows({
				table: schema.paymentTransaction,
				filter: { id, recievedAt: { isNull: true }, discardedAt: { isNull: true } }
			})
		)
		.returning({ id: schema.paymentTransaction.id });
	// changed between the read and the write
	if (written.length === 0) {
		throw apiError({ code: 'CONFLICT', message: m.paymentReferenceDiscarded() });
	}
	paymentTransactionPubsub.updated(id);
}

/** Why the payer can no longer change a payment: its money arrived, or they gave it up. */
export function openPaymentProblem(payment: {
	recievedAt: Date | null;
	discardedAt: Date | null;
}): 'RECEIVED' | 'DISCARDED' | undefined {
	if (payment.recievedAt) return 'RECEIVED';
	if (payment.discardedAt) return 'DISCARDED';
	return undefined;
}

/**
 * The payer says they transferred the money (`reported`), or takes that back. Only their word: it
 * changes nobody's payment status, which participant care sets once the money is there.
 */
export async function reportPaymentTransfer({ id, reported }: { id: string; reported: boolean }) {
	await updateOpenPayment({ id, changes: { transferReportedAt: reported ? new Date() : null } });
}

/**
 * The payer gives the reference up to start over. It is kept, marked given up, so participant care
 * can still match a transfer made with it; a new reference for the same people is a new one.
 */
export async function discardPaymentTransaction(id: string) {
	await updateOpenPayment({ id, changes: { discardedAt: new Date() } });
}
