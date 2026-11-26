import { sql } from 'drizzle-orm';
import { type Transaction, db, schema } from '#api/db/db';
import {
	bankTransferPubsub,
	conferenceParticipantPubsub,
	paymentTransactionPubsub
} from '#api/pubsub';
import {
	lockPaymentStatus,
	writePaymentStatus
} from '#api/handlers/paymentTransaction/paymentTransactionService';
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
	/** Who sent the money, as the bank names them; `undefined` when the bank gave no name. */
	counterparty?: string;
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

type Reader = Pick<typeof db, 'query'>;

/** The payments these reference candidates name, with what `decideTransfer` needs of them. */
function paymentsNamed({
	reader,
	candidates
}: {
	reader: Reader;
	candidates: readonly string[];
}): Promise<NamedPayment[]> {
	return reader.query.paymentTransaction.findMany({
		where: { id: { in: [...candidates] } },
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
 * Settles the payments a transfer names in `tx`, under a lock on the transfer: skips a transfer
 * recorded before, decides on the payments as they stand once everybody they cover is locked (so a
 * person changing a status at the same moment is waited for, not overwritten), writes the statuses
 * and records the transfer. All of it commits together or not at all.
 */
async function settleTransfer({
	tx,
	transfer,
	candidates
}: {
	tx: Transaction;
	transfer: IncomingTransfer;
	candidates: readonly string[];
}) {
	// overlapping runs handle one transfer one after the other
	await tx.execute(
		sql`select pg_advisory_xact_lock(hashtextextended(${`bank_transfer:${transfer.externalId}`}, 0))`
	);
	const before = await tx.query.bankTransfer.findFirst({
		where: { externalId: transfer.externalId },
		columns: { id: true }
	});
	if (before) return undefined;

	const named = await paymentsNamed({ reader: tx, candidates });
	await lockPaymentStatus({
		tx,
		participantIds: named.flatMap((payment) =>
			payment.paymentFor.map((p) => p.conferenceParticipantId)
		)
	});
	// read again under the locks: what the decision rests on can no longer change
	const payments = await paymentsNamed({ reader: tx, candidates });
	const results = decideTransfer({ amount: transfer.amount, payments });

	const covered: string[] = [];
	for (const payment of payments) {
		const received = results.find((r) => r.paymentId === payment.id)?.result === 'RECEIVED';
		covered.push(
			...(await writePaymentStatus({
				tx,
				payment,
				assignedStatus: received ? 'DONE' : 'NEEDS_HUMAN_REVIEW',
				recievedAt: received ? transfer.bookedAt : undefined
			}))
		);
	}
	await tx.insert(schema.bankTransfer).values(
		results.map(({ paymentId, result }) => ({
			externalId: transfer.externalId,
			paymentTransactionId: paymentId,
			amount: transfer.amount,
			bookedAt: transfer.bookedAt,
			counterparty: transfer.counterparty ?? null,
			purpose: transfer.purpose || null,
			result
		}))
	);
	return { results, covered };
}

/**
 * Handles one incoming transfer: finds the payments its purpose names, marks them received when
 * the transfer settles them (`decideTransfer`), with the transfer's booking day, and otherwise sets
 * everybody they cover to `NEEDS_HUMAN_REVIEW`. Records what it did per payment (`bankTransfer`),
 * which also keeps a transfer from being handled twice; the statuses and the record commit in one
 * transaction (`settleTransfer`), and are announced after it. With `dryRun` it only says what it
 * would do.
 */
export async function handleIncomingTransfer({
	transfer,
	dryRun = false
}: {
	transfer: IncomingTransfer;
	dryRun?: boolean;
}): Promise<TransferOutcome> {
	const candidates = paymentReferenceCandidates(transfer.purpose);
	if (candidates.length === 0) return { kind: 'noReference' };
	// most transfers name no payment: find that out without a transaction
	const named = await paymentsNamed({ reader: db, candidates });
	if (named.length === 0) return { kind: 'noReference' };

	if (dryRun) {
		const before = await db.query.bankTransfer.findFirst({
			where: { externalId: transfer.externalId },
			columns: { id: true }
		});
		if (before) return { kind: 'handledBefore' };
		return {
			kind: 'handled',
			results: decideTransfer({ amount: transfer.amount, payments: named })
		};
	}

	const settled = await db.transaction((tx) => settleTransfer({ tx, transfer, candidates }));
	if (!settled) return { kind: 'handledBefore' };

	paymentTransactionPubsub.updated(settled.results.map((r) => r.paymentId));
	if (settled.covered.length > 0) conferenceParticipantPubsub.updated(settled.covered);
	bankTransferPubsub.created();
	return { kind: 'handled', results: settled.results };
}
