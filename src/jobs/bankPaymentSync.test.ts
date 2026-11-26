import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BankTransaction } from './apis/buchhaltungsbutler/buchhaltungsbutlerClient';

const handleIncomingTransfer = vi.hoisted(() => vi.fn());
const lastHandledTransferId = vi.hoisted(() => vi.fn<() => Promise<number | undefined>>());

vi.mock('#api/handlers/bankTransfer/bankTransferService', () => ({
	handleIncomingTransfer,
	lastHandledTransferId
}));

const { incomingTransfer, runBankPaymentSync } = await import('./bankPaymentSync');
const { lookbackStart } = await import('./bankLookback');

function transaction(overrides: Partial<BankTransaction> = {}): BankTransaction {
	return {
		id_by_customer: 1,
		to_from: 'Somebody',
		amount: 50,
		booking_date: '2026-11-20 00:00:00',
		purpose: 'ACDE-FHJK-MNPR-TUVW',
		...overrides
	};
}

describe('lookbackStart', () => {
	it('is the day so many days before, in UTC', () => {
		expect(lookbackStart({ now: new Date('2026-11-26T10:00:00Z'), days: 60 })).toBe('2026-09-27');
	});
});

describe('incomingTransfer', () => {
	it('reads the booking day, the purpose and the sender', () => {
		expect(incomingTransfer(transaction())).toEqual({
			externalId: 1,
			amount: 50,
			bookedAt: new Date('2026-11-20T00:00:00Z'),
			purpose: 'ACDE-FHJK-MNPR-TUVW',
			counterparty: 'Somebody'
		});
	});

	it('leaves a missing or blank sender out', () => {
		expect(incomingTransfer(transaction({ to_from: null }))?.counterparty).toBeUndefined();
		expect(incomingTransfer(transaction({ to_from: '  ' }))?.counterparty).toBeUndefined();
	});

	it('takes a missing purpose as empty', () => {
		expect(incomingTransfer(transaction({ purpose: null }))?.purpose).toBe('');
	});

	it('leaves out money going out and transactions of nothing', () => {
		expect(incomingTransfer(transaction({ amount: -50 }))).toBeUndefined();
		expect(incomingTransfer(transaction({ amount: 0 }))).toBeUndefined();
	});

	it('leaves out a transaction without a readable booking date', () => {
		expect(incomingTransfer(transaction({ booking_date: 'soon' }))).toBeUndefined();
	});
});

describe('runBankPaymentSync', () => {
	const now = new Date('2026-11-26T10:00:00Z');

	beforeEach(() => {
		vi.clearAllMocks();
		lastHandledTransferId.mockResolvedValue(undefined);
		handleIncomingTransfer.mockResolvedValue({ kind: 'noReference' });
	});

	it('reads two months back on its first run', async () => {
		const transactions = vi.fn(() => Promise.resolve([]));
		await runBankPaymentSync({ client: { transactions }, now });
		expect(transactions).toHaveBeenCalledWith({
			dateFrom: '2026-09-27',
			afterId: undefined,
			offset: 0
		});
	});

	it('continues after the last transfer it handled, still within the look-back', async () => {
		lastHandledTransferId.mockResolvedValue(812);
		const transactions = vi.fn(() => Promise.resolve([]));
		await runBankPaymentSync({ client: { transactions }, now, lookbackDays: 10 });
		expect(transactions).toHaveBeenCalledWith({
			dateFrom: '2026-11-16',
			afterId: 812,
			offset: 0
		});
	});

	it('pages until a page is not full', async () => {
		const full = Array.from({ length: 500 }, (_, i) => transaction({ id_by_customer: i }));
		const transactions = vi
			.fn<() => Promise<BankTransaction[]>>()
			.mockResolvedValueOnce(full)
			.mockResolvedValueOnce([transaction({ id_by_customer: 600 })]);
		const summary = await runBankPaymentSync({ client: { transactions }, now });
		expect(transactions).toHaveBeenCalledTimes(2);
		expect(transactions).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 500 }));
		expect(summary.read).toBe(501);
	});

	it('hands incoming transfers on, skips outgoing ones and counts the outcome', async () => {
		handleIncomingTransfer
			.mockResolvedValueOnce({
				kind: 'handled',
				results: [
					{ paymentId: 'a', result: 'RECEIVED' },
					{ paymentId: 'b', result: 'AMOUNT_MISMATCH' }
				]
			})
			.mockResolvedValueOnce({ kind: 'handledBefore' });
		const transactions = vi.fn(() =>
			Promise.resolve([
				transaction({ id_by_customer: 1 }),
				transaction({ id_by_customer: 2, amount: -10 }),
				transaction({ id_by_customer: 3 })
			])
		);
		const summary = await runBankPaymentSync({ client: { transactions }, now, dryRun: true });
		expect(handleIncomingTransfer).toHaveBeenCalledTimes(2);
		expect(handleIncomingTransfer).toHaveBeenCalledWith(
			expect.objectContaining({
				dryRun: true,
				transfer: expect.objectContaining({ externalId: 1 })
			})
		);
		expect(summary).toEqual({ read: 3, received: 1, flagged: 1 });
	});
});
