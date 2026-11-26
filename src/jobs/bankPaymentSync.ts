import {
	handleIncomingTransfer,
	lastHandledTransferId,
	type IncomingTransfer
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
		purpose: transaction.purpose ?? ''
	};
}

export interface SyncSummary {
	read: number;
	received: number;
	flagged: number;
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
	for (const transfer of transactions.map(incomingTransfer)) {
		if (!transfer) continue;
		const outcome = await handleIncomingTransfer({ transfer, dryRun });
		if (outcome.kind !== 'handled') continue;
		for (const { paymentId, result } of outcome.results) {
			summary[result === 'RECEIVED' ? 'received' : 'flagged']++;
			logger.info('Matched a bank transfer', {
				externalId: transfer.externalId,
				paymentId,
				result,
				dryRun
			});
		}
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
	const summary: SyncSummary = { read: 0, received: 0, flagged: 0 };

	let page = 0;
	for (; page < MAX_PAGES; page++) {
		const transactions = await client.transactions({
			dateFrom,
			afterId,
			offset: page * MAX_PAGE_SIZE
		});
		summary.read += transactions.length;
		await handlePage({ transactions, dryRun, summary });
		if (transactions.length < MAX_PAGE_SIZE) break;
	}
	if (page === MAX_PAGES) {
		logger.warn('Stopped reading bank transactions after the page limit', { pages: MAX_PAGES });
	}

	logger.info('Bank payment sync done', { ...summary, dateFrom, afterId, dryRun });
	return summary;
}
