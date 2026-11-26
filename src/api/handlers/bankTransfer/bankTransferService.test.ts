import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NamedPayment } from './bankTransferService';

const state = vi.hoisted(() => ({
	payments: new Array<unknown>(),
	handledBefore: false,
	lastId: undefined as number | undefined
}));
const findPayments = vi.hoisted(() => vi.fn());
const applyPaymentStatus = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const inserted = vi.hoisted(() => vi.fn());
const created = vi.hoisted(() => vi.fn());

vi.mock('#api/db/db', () => ({
	schema: { bankTransfer: { id: 'bank_transfer.id' } },
	db: {
		query: {
			paymentTransaction: {
				findMany: (args: unknown) => {
					findPayments(args);
					return Promise.resolve(state.payments);
				}
			},
			bankTransfer: {
				findFirst: (args: { where?: unknown }) =>
					Promise.resolve(
						args.where
							? state.handledBefore
								? { id: 'before' }
								: undefined
							: state.lastId === undefined
								? undefined
								: { externalId: state.lastId }
					)
			}
		},
		insert: () => ({
			values: (values: unknown[]) => {
				inserted(values);
				return {
					onConflictDoNothing: () => ({
						returning: () => Promise.resolve(values.map((_, i) => ({ id: `row-${i}` })))
					})
				};
			}
		})
	}
}));
vi.mock('#api/pubsub', () => ({ bankTransferPubsub: { created } }));
vi.mock('#api/handlers/paymentTransaction/paymentTransactionService', () => ({
	applyPaymentStatus
}));

const { decideTransfer, handleIncomingTransfer, lastHandledTransferId } =
	await import('./bankTransferService');

function payment({
	id,
	amount = 50,
	recievedAt = null,
	statuses = ['PENDING']
}: {
	id: string;
	amount?: number;
	recievedAt?: Date | null;
	statuses?: string[];
}): NamedPayment {
	return {
		id,
		amount,
		recievedAt,
		paymentFor: statuses.map((paymentStatus, i) => ({
			conferenceParticipantId: `${id}-p${i}`,
			participant: { paymentStatus }
		}))
	};
}

const REFERENCE = 'ACDE-FHJK-MNPR-TUVW';
const transfer = {
	externalId: 42,
	amount: 50,
	bookedAt: new Date('2026-11-20T00:00:00Z'),
	purpose: `Beitrag ${REFERENCE}`
};

describe('decideTransfer', () => {
	it('settles an open payment whose amount it is', () => {
		expect(decideTransfer({ amount: 50, payments: [payment({ id: 'a' })] })).toEqual([
			{ paymentId: 'a', result: 'RECEIVED' }
		]);
	});

	it('ignores differences below half a cent', () => {
		expect(decideTransfer({ amount: 50.001, payments: [payment({ id: 'a' })] })[0].result).toBe(
			'RECEIVED'
		);
	});

	it('flags a payment whose amount it is not, paid too little or too much', () => {
		for (const amount of [49.99, 25, 100]) {
			expect(decideTransfer({ amount, payments: [payment({ id: 'a' })] })[0].result).toBe(
				'AMOUNT_MISMATCH'
			);
		}
	});

	it('settles several payments named together when it is their sum', () => {
		const payments = [payment({ id: 'a' }), payment({ id: 'b', amount: 100 })];
		expect(decideTransfer({ amount: 150, payments }).map((r) => r.result)).toEqual([
			'RECEIVED',
			'RECEIVED'
		]);
		expect(decideTransfer({ amount: 50, payments }).map((r) => r.result)).toEqual([
			'AMOUNT_MISMATCH',
			'AMOUNT_MISMATCH'
		]);
	});

	it('flags a payment received before as paid twice', () => {
		const received = payment({ id: 'a', recievedAt: new Date('2026-10-01') });
		expect(decideTransfer({ amount: 50, payments: [received] })[0].result).toBe('ALREADY_RECEIVED');
	});

	it('counts a payment as paid once somebody it covers is marked paid another way', () => {
		const covered = payment({ id: 'a', statuses: ['DONE', 'PENDING'], amount: 100 });
		expect(decideTransfer({ amount: 100, payments: [covered] })[0].result).toBe('ALREADY_RECEIVED');
	});

	it('settles nothing of a transfer that also names a paid payment', () => {
		const payments = [payment({ id: 'a', recievedAt: new Date() }), payment({ id: 'b' })];
		expect(decideTransfer({ amount: 50, payments })).toEqual([
			{ paymentId: 'a', result: 'ALREADY_RECEIVED' },
			{ paymentId: 'b', result: 'AMOUNT_MISMATCH' }
		]);
	});

	it('settles a payment flagged or marked a problem before, once the money fits', () => {
		for (const status of ['NEEDS_HUMAN_REVIEW', 'PROBLEM']) {
			const flagged = payment({ id: 'a', statuses: [status] });
			expect(decideTransfer({ amount: 50, payments: [flagged] })[0].result).toBe('RECEIVED');
		}
	});
});

describe('handleIncomingTransfer', () => {
	beforeEach(() => {
		state.payments = [];
		state.handledBefore = false;
		vi.clearAllMocks();
	});

	it('skips a transfer naming no payment, without looking further', async () => {
		expect(await handleIncomingTransfer({ transfer: { ...transfer, purpose: 'Miete' } })).toEqual({
			kind: 'noReference'
		});
		expect(findPayments).not.toHaveBeenCalled();
		expect(applyPaymentStatus).not.toHaveBeenCalled();
	});

	it('looks the candidates of the purpose up as payment ids', async () => {
		await handleIncomingTransfer({ transfer });
		expect(findPayments).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: { in: [REFERENCE] } } })
		);
	});

	it('marks a fitting payment received on the booking day and records the transfer', async () => {
		const open = payment({ id: REFERENCE });
		state.payments = [open];
		expect(await handleIncomingTransfer({ transfer })).toEqual({
			kind: 'handled',
			results: [{ paymentId: REFERENCE, result: 'RECEIVED' }]
		});
		expect(applyPaymentStatus).toHaveBeenCalledWith({
			payment: open,
			assignedStatus: 'DONE',
			recievedAt: transfer.bookedAt
		});
		expect(inserted).toHaveBeenCalledWith([
			{
				externalId: 42,
				paymentTransactionId: REFERENCE,
				amount: 50,
				bookedAt: transfer.bookedAt,
				result: 'RECEIVED'
			}
		]);
		expect(created).toHaveBeenCalled();
	});

	it('flags everybody a mismatching payment covers for review, without a date', async () => {
		const open = payment({ id: REFERENCE });
		state.payments = [open];
		await handleIncomingTransfer({ transfer: { ...transfer, amount: 20 } });
		expect(applyPaymentStatus).toHaveBeenCalledWith({
			payment: open,
			assignedStatus: 'NEEDS_HUMAN_REVIEW',
			recievedAt: undefined
		});
	});

	it('does nothing for a transfer it handled before', async () => {
		state.payments = [payment({ id: REFERENCE })];
		state.handledBefore = true;
		expect(await handleIncomingTransfer({ transfer })).toEqual({ kind: 'handledBefore' });
		expect(applyPaymentStatus).not.toHaveBeenCalled();
		expect(inserted).not.toHaveBeenCalled();
	});

	it('only tells what it would do on a dry run', async () => {
		state.payments = [payment({ id: REFERENCE })];
		expect(await handleIncomingTransfer({ transfer, dryRun: true })).toEqual({
			kind: 'handled',
			results: [{ paymentId: REFERENCE, result: 'RECEIVED' }]
		});
		expect(applyPaymentStatus).not.toHaveBeenCalled();
		expect(inserted).not.toHaveBeenCalled();
	});
});

describe('lastHandledTransferId', () => {
	it('is the highest recorded transfer id, none before the first', async () => {
		state.lastId = undefined;
		expect(await lastHandledTransferId()).toBeUndefined();
		state.lastId = 7;
		expect(await lastHandledTransferId()).toBe(7);
	});
});
