import { db, schema } from '#api/db/db';
import { bankTransferPubsub } from '#api/pubsub';
import { applyPaymentStatus } from '#api/handlers/paymentTransaction/paymentTransactionService';
import { paymentReferenceCandidates } from '#api/handlers/paymentTransaction/paymentReference';

type BankTransferResult = (typeof schema.bankTransferResult.enumValues)[number];

/** An incoming transfer as the bank payment sync reads it from the bank. */
export interface IncomingTransfer {
	/** The bank side's id of the transfer (BuchhaltungsButler's `id_by_customer`). */
	externalId: number;
	amount: number;
	bookedAt: Date;
	/** The Verwendungszweck. */
	purpose: string;
}

/** A payment a transfer names, with what decides whether the transfer settles it. */
export interface NamedPayment {
	id: string;
	amount: number;
	recievedAt: Date | null;
	paymentFor: { conferenceParticipantId: string; participant: { paymentStatus: string } }[];
}

/** Amounts are euros and cents in a double: anything closer than half a cent is the same. */
const sameAmount = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * A payment counts as settled once its money arrived, or once somebody it covers is marked paid
 * another way (another reference, cash): a transfer for it then is a second payment.
 */
const settled = (payment: NamedPayment) =>
	payment.recievedAt !== null ||
	payment.paymentFor.some(({ participant }) => participant.paymentStatus === 'DONE');

/**
 * What a transfer does to each payment it names. It settles them (`RECEIVED`) when they are all
 * open and its amount is theirs together; otherwise a person has to look at every one of them:
 * those settled before are `ALREADY_RECEIVED`, the others `AMOUNT_MISMATCH`.
 */
export function decideTransfer({
	amount,
	payments
}: {
	amount: number;
	payments: readonly NamedPayment[];
}): { paymentId: string; result: BankTransferResult }[] {
	const anySettled = payments.some(settled);
	const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
	const fits = !anySettled && sameAmount(total, amount);
	return payments.map((payment) => ({
		paymentId: payment.id,
		result: settled(payment) ? 'ALREADY_RECEIVED' : fits ? 'RECEIVED' : 'AMOUNT_MISMATCH'
	}));
}

/** The payments a purpose names, with what `decideTransfer` needs of them. */
function paymentsNamedIn(purpose: string): Promise<NamedPayment[]> {
	const candidates = paymentReferenceCandidates(purpose);
	if (candidates.length === 0) return Promise.resolve([]);
	return db.query.paymentTransaction.findMany({
		where: { id: { in: candidates } },
		columns: { id: true, amount: true, recievedAt: true },
		with: {
			paymentFor: {
				columns: { conferenceParticipantId: true },
				with: { participant: { columns: { paymentStatus: true } } }
			}
		}
	});
}

/** The highest transfer id handled so far, where the next sync continues. */
export async function lastHandledTransferId(): Promise<number | undefined> {
	const last = await db.query.bankTransfer.findFirst({
		columns: { externalId: true },
		orderBy: { externalId: 'desc' }
	});
	return last?.externalId;
}

export type TransferOutcome =
	| { kind: 'noReference' }
	| { kind: 'handledBefore' }
	| { kind: 'handled'; results: { paymentId: string; result: BankTransferResult }[] };

/**
 * Handles one incoming transfer: finds the payments its purpose names, marks them received when
 * the transfer settles them (`decideTransfer`), with the transfer's booking day, and otherwise sets
 * everybody they cover to `NEEDS_HUMAN_REVIEW`. Records what it did per payment (`bankTransfer`),
 * which also keeps a transfer from being handled twice. With `dryRun` only says what it would do.
 */
export async function handleIncomingTransfer({
	transfer,
	dryRun = false
}: {
	transfer: IncomingTransfer;
	dryRun?: boolean;
}): Promise<TransferOutcome> {
	const payments = await paymentsNamedIn(transfer.purpose);
	if (payments.length === 0) return { kind: 'noReference' };

	const before = await db.query.bankTransfer.findFirst({
		where: { externalId: transfer.externalId },
		columns: { id: true }
	});
	if (before) return { kind: 'handledBefore' };

	const results = decideTransfer({ amount: transfer.amount, payments });
	if (dryRun) return { kind: 'handled', results };

	for (const payment of payments) {
		const received = results.find((r) => r.paymentId === payment.id)?.result === 'RECEIVED';
		await applyPaymentStatus({
			payment,
			assignedStatus: received ? 'DONE' : 'NEEDS_HUMAN_REVIEW',
			recievedAt: received ? transfer.bookedAt : undefined
		});
	}
	const rows = await db
		.insert(schema.bankTransfer)
		.values(
			results.map(({ paymentId, result }) => ({
				externalId: transfer.externalId,
				paymentTransactionId: paymentId,
				amount: transfer.amount,
				bookedAt: transfer.bookedAt,
				result
			}))
		)
		.onConflictDoNothing()
		.returning({ id: schema.bankTransfer.id });
	if (rows.length > 0) bankTransferPubsub.created();

	return { kind: 'handled', results };
}
