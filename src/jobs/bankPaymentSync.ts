import {
	handleIncomingTransfer,
	lastHandledTransferId,
	type IncomingTransfer,
	type TransferOutcome
} from '#api/handlers/bankTransfer/bankTransferService';
import { logger } from '#lib/logger';
import {
	MAX_PAGE_SIZE,
	type BankTransaction,
	type BuchhaltungsButlerClient
} from './apis/buchhaltungsbutler/buchhaltungsbutlerClient';
import { DEFAULT_LOOKBACK_DAYS, lookbackStart } from './bankLookback';

/** Pages of one run at most, so a run cannot go on forever: 50 × 500 transactions. */
const MAX_PAGES = 50;

/**
 * A transaction as the payment matching reads it, or `undefined` for one that cannot pay anything:
 * money going out, or none at all.
 */
export function incomingTransfer(transaction: BankTransaction): IncomingTransfer | undefined {
	if (!(transaction.amount > 0)) return undefined;
	// BuchhaltungsButler writes `YYYY-MM-DD HH:MM:SS`: the booking day is what counts
	const bookedAt = new Date(`${transaction.booking_date.slice(0, 10)}T00:00:00Z`);
	if (Number.isNaN(bookedAt.getTime())) return undefined;
	return {
		externalId: transaction.id_by_customer,
		amount: transaction.amount,
		bookedAt,
		purpose: transaction.purpose ?? '',
		counterparty: transaction.to_from?.trim() || undefined
	};
}

/**
 * What one run did, in counts only, so the closing log line shows the sync works even on a day
 * without a matching transfer. Nothing in it names a person or a single transfer: the amount is the
 * sum of the payments it settled, the booking days are the range the run read.
 */
export interface SyncSummary {
	/** Transactions BuchhaltungsButler returned, in `pages` requests. */
	read: number;
	pages: number;
	/** Money going out or none at all, which cannot pay anything. */
	outgoing: number;
	/** Incoming, but without a booking date that can be read. */
	unreadable: number;
	/** Incoming transfers handed to the payment matching. */
	incoming: number;
	/** Incoming transfers whose purpose names no known payment. */
	withoutReference: number;
	/** Transfers a run before already handled, left as they are. */
	handledBefore: number;
	/** Transfers that named at least one payment and were handled now. */
	matchedTransfers: number;
	/** Payments marked received, and the sum of their transfers in euros. */
	received: number;
	receivedAmount: number;
	/** Payments set to `NEEDS_HUMAN_REVIEW`: `alreadyReceived` + `amountMismatch`. */
	flagged: number;
	alreadyReceived: number;
	amountMismatch: number;
	/** The earliest and latest booking day of the transactions read, `YYYY-MM-DD`. */
	bookedFrom?: string;
	bookedTo?: string;
}

function emptySummary(): SyncSummary {
	return {
		read: 0,
		pages: 0,
		outgoing: 0,
		unreadable: 0,
		incoming: 0,
		withoutReference: 0,
		handledBefore: 0,
		matchedTransfers: 0,
		received: 0,
		receivedAmount: 0,
		flagged: 0,
		alreadyReceived: 0,
		amountMismatch: 0
	};
}

function countBookingDay({ summary, bookingDate }: { summary: SyncSummary; bookingDate: string }) {
	const day = bookingDate.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
	if (!summary.bookedFrom || day < summary.bookedFrom) summary.bookedFrom = day;
	if (!summary.bookedTo || day > summary.bookedTo) summary.bookedTo = day;
}

/** Counts what came of one incoming transfer into `summary`, and logs the payments it named. */
function countOutcome({
	transfer,
	outcome,
	dryRun,
	summary
}: {
	transfer: IncomingTransfer;
	outcome: TransferOutcome;
	dryRun: boolean;
	summary: SyncSummary;
}) {
	if (outcome.kind !== 'handled') {
		summary[outcome.kind === 'noReference' ? 'withoutReference' : 'handledBefore']++;
		return;
	}
	summary.matchedTransfers++;
	if (outcome.results.some(({ result }) => result === 'RECEIVED')) {
		summary.receivedAmount += transfer.amount;
	}
	for (const { paymentId, result } of outcome.results) {
		if (result === 'RECEIVED') summary.received++;
		else {
			summary.flagged++;
			summary[result === 'ALREADY_RECEIVED' ? 'alreadyReceived' : 'amountMismatch']++;
		}
		logger.info('Matched a bank transfer', {
			externalId: transfer.externalId,
			paymentId,
			result,
			dryRun
		});
	}
}

/** Hands one page's incoming transfers on, counting what came of them into `summary`. */
async function handlePage({
	transactions,
	dryRun,
	summary
}: {
	transactions: readonly BankTransaction[];
	dryRun: boolean;
	summary: SyncSummary;
}) {
	for (const transaction of transactions) {
		countBookingDay({ summary, bookingDate: transaction.booking_date });
		const transfer = incomingTransfer(transaction);
		if (!transfer) {
			summary[transaction.amount > 0 ? 'unreadable' : 'outgoing']++;
			continue;
		}
		summary.incoming++;
		const outcome = await handleIncomingTransfer({ transfer, dryRun });
		countOutcome({ transfer, outcome, dryRun, summary });
	}
}

/**
 * Reads the incoming bank transactions from BuchhaltungsButler, of every bank account, and
 * settles the payments whose reference stands anywhere in a transfer's purpose
 * (`handleIncomingTransfer`): marked received when the amount fits, flagged `NEEDS_HUMAN_REVIEW`
 * otherwise. Continues after the last transfer it handled, but never looks further back than
 * `lookbackDays`, so a first run (or one after a long pause) reads two months, not the whole
 * history. With `dryRun` it only logs what it would do. Daily is enough.
 */
export async function runBankPaymentSync({
	client,
	lookbackDays = DEFAULT_LOOKBACK_DAYS,
	dryRun = false,
	now = new Date()
}: {
	client: BuchhaltungsButlerClient;
	lookbackDays?: number;
	dryRun?: boolean;
	now?: Date;
}): Promise<SyncSummary> {
	const dateFrom = lookbackStart({ now, days: lookbackDays });
	const afterId = await lastHandledTransferId();
	const summary = emptySummary();

	let page = 0;
	for (; page < MAX_PAGES; page++) {
		const transactions = await client.transactions({
			dateFrom,
			afterId,
			offset: page * MAX_PAGE_SIZE
		});
		summary.pages++;
		summary.read += transactions.length;
		await handlePage({ transactions, dryRun, summary });
		if (transactions.length < MAX_PAGE_SIZE) break;
	}
	if (page === MAX_PAGES) {
		logger.warn('Stopped reading bank transactions after the page limit', { pages: MAX_PAGES });
	}

	// cents, as a sum of floats drifts
	summary.receivedAmount = Math.round(summary.receivedAmount * 100) / 100;
	logger.info('Bank payment sync done', { ...summary, dateFrom, afterId, dryRun });
	return summary;
}
