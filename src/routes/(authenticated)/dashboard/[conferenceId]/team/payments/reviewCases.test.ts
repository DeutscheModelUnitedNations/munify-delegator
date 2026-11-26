import { describe, expect, it } from 'vitest';
import {
	type CasePayment,
	type CaseTransfer,
	flaggingTransfer,
	paidDecisions,
	preselected,
	reviewCases
} from './reviewCases';

const transfer = (overrides: Partial<CaseTransfer> = {}): CaseTransfer => ({
	externalId: 1,
	amount: 85,
	bookedAt: '2026-11-20T00:00:00Z',
	result: 'AMOUNT_MISMATCH',
	...overrides
});

const payment = ({
	id,
	people = ['a'],
	amount = 85 * people.length,
	status = 'NEEDS_HUMAN_REVIEW',
	transfers = []
}: {
	id: string;
	people?: string[];
	amount?: number;
	status?: string;
	transfers?: CaseTransfer[];
}): CasePayment => ({
	id,
	amount,
	paymentFor: people.map((conferenceParticipantId) => ({
		conferenceParticipantId,
		participant: { paymentStatus: status }
	})),
	bankTransfers: transfers
});

describe('flaggingTransfer', () => {
	it('is the newest transfer that did not settle the payment', () => {
		const older = transfer({ externalId: 1, bookedAt: '2026-11-01T00:00:00Z' });
		const newer = transfer({ externalId: 2, bookedAt: '2026-11-10T00:00:00Z' });
		const settling = transfer({
			externalId: 3,
			bookedAt: '2026-11-20T00:00:00Z',
			result: 'RECEIVED'
		});
		expect(flaggingTransfer(payment({ id: 'p', transfers: [older, settling, newer] }))).toBe(newer);
		expect(flaggingTransfer(payment({ id: 'p', transfers: [settling] }))).toBeUndefined();
	});
});

describe('reviewCases', () => {
	it('tells a transfer that brought too little from one that brought too much', () => {
		const [low] = reviewCases([
			payment({ id: 'low', people: ['a', 'b'], transfers: [transfer({ amount: 85 })] })
		]);
		expect(low).toMatchObject({ key: 'transfer:1', kind: 'tooLow', expected: 170 });

		const [high] = reviewCases([payment({ id: 'high', transfers: [transfer({ amount: 100 })] })]);
		expect(high.kind).toBe('tooHigh');
	});

	it('is one case for a transfer naming two references', () => {
		const shared = transfer({ externalId: 7, amount: 175 });
		const cases = reviewCases([
			payment({ id: 'x', transfers: [shared] }),
			payment({ id: 'y', transfers: [shared] })
		]);
		expect(cases).toHaveLength(1);
		expect(cases[0]).toMatchObject({ kind: 'tooHigh', expected: 170 });
		expect(cases[0].payments.map((p) => p.id)).toEqual(['x', 'y']);
	});

	it('marks a payment paid twice, whatever the amount', () => {
		const [twice] = reviewCases([
			payment({ id: 'p', transfers: [transfer({ result: 'ALREADY_RECEIVED' })] })
		]);
		expect(twice.kind).toBe('alreadyReceived');
	});

	it('keeps a payment flagged by hand as a case of its own, after the transfers', () => {
		const cases = reviewCases([
			payment({ id: 'by-hand' }),
			payment({ id: 'late', transfers: [transfer({ externalId: 2, bookedAt: '2026-11-22' })] }),
			payment({ id: 'early', transfers: [transfer({ externalId: 3, bookedAt: '2026-11-02' })] })
		]);
		expect(cases.map((c) => c.key)).toEqual(['transfer:3', 'transfer:2', 'payment:by-hand']);
		expect(cases[2].kind).toBe('flagged');
	});

	it('leaves out payments nobody has to look at any more', () => {
		expect(reviewCases([payment({ id: 'p', status: 'DONE', transfers: [transfer()] })])).toEqual(
			[]
		);
	});
});

describe('preselected', () => {
	it('ticks as many people as a short transfer pays for', () => {
		const [low] = reviewCases([
			payment({
				id: 'p',
				people: ['a', 'b', 'c', 'd', 'e'],
				transfers: [transfer({ amount: 340 })]
			})
		]);
		expect(preselected(low)).toEqual(['a', 'b', 'c', 'd']);
	});

	it('ticks everybody for too much and nobody for a payment paid twice', () => {
		const [high] = reviewCases([
			payment({ id: 'p', people: ['a', 'b'], transfers: [transfer({ amount: 200 })] })
		]);
		expect(preselected(high)).toEqual(['a', 'b']);
		const [twice] = reviewCases([
			payment({ id: 'p', transfers: [transfer({ result: 'ALREADY_RECEIVED' })] })
		]);
		expect(preselected(twice)).toEqual([]);
	});
});

describe('paidDecisions', () => {
	it('receives, settles in part or sends back each payment by who is ticked', () => {
		const payments = [
			payment({ id: 'all', people: ['a', 'b'] }),
			payment({ id: 'some', people: ['c', 'd'] }),
			payment({ id: 'none', people: ['e'] })
		];
		expect(paidDecisions({ payments, paid: ['a', 'b', 'd'] })).toEqual([
			{ paymentId: 'all', kind: 'received' },
			{ paymentId: 'some', kind: 'partly', paidFor: ['d'] },
			{ paymentId: 'none', kind: 'pending' }
		]);
	});
});
