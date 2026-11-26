import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NamedPayment } from './bankTransferService';

const state = vi.hoisted(() => ({
	payments: new Array<unknown>(),
	handledBefore: false,
	lastId: undefined as number | undefined
}));
/** What happened, in order: reads, locks, writes, the commit and what was announced. */
const steps = vi.hoisted(() => new Array<string>());
const findPayments = vi.hoisted(() => vi.fn());
const writePaymentStatus = vi.hoisted(() =>
	vi.fn(({ payment }: { payment: { paymentFor: { conferenceParticipantId: string }[] } }) => {
		steps.push('write status');
		return Promise.resolve(payment.paymentFor.map((p) => p.conferenceParticipantId));
	})
);
const lockPaymentStatus = vi.hoisted(() =>
	vi.fn(() => {
		steps.push('lock participants');
		return Promise.resolve([]);
	})
);
const inserted = vi.hoisted(() => vi.fn());
const announced = vi.hoisted(() => ({
	transfers: vi.fn(() => steps.push('announce transfers')),
	payments: vi.fn(),
	participants: vi.fn()
}));

vi.mock('#api/db/db', () => {
	const query = {
		paymentTransaction: {
			findMany: (args: unknown) => {
				steps.push('read payments');
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
	};
	const tx = {
		query,
		execute: () => {
			steps.push('lock transfer');
			return Promise.resolve();
		},
		insert: () => ({
			values: (values: unknown[]) => {
				steps.push('record transfer');
				inserted(values);
				return Promise.resolve();
			}
		})
	};
	return {
		schema: { bankTransfer: {} },
		db: {
			query,
			transaction: async (run: (t: typeof tx) => unknown) => {
				const result = await run(tx);
				steps.push('commit');
				return result;
			}
		}
	};
});
vi.mock('drizzle-orm', () => ({ sql: () => 'sql' }));
vi.mock('#api/pubsub', () => ({
	bankTransferPubsub: { created: announced.transfers },
	paymentTransactionPubsub: { updated: announced.payments },
	conferenceParticipantPubsub: { updated: announced.participants }
}));
vi.mock('#api/handlers/paymentTransaction/paymentTransactionService', () => ({
	writePaymentStatus,
	lockPaymentStatus
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
		steps.length = 0;
		vi.clearAllMocks();
	});

	it('skips a transfer without a reference-shaped string, without looking further', async () => {
		expect(await handleIncomingTransfer({ transfer: { ...transfer, purpose: 'Miete' } })).toEqual({
			kind: 'noReference'
		});
		expect(findPayments).not.toHaveBeenCalled();
	});

	it('skips a transfer naming no payment, without a transaction', async () => {
		expect(await handleIncomingTransfer({ transfer })).toEqual({ kind: 'noReference' });
		expect(steps).toEqual(['read payments']);
	});

	it('looks the candidates of the purpose up as payment ids', async () => {
		await handleIncomingTransfer({ transfer });
		expect(findPayments).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: { in: [REFERENCE] } } })
		);
	});

	it('settles in one transaction: lock, re-read under the locks, write, record, then announce', async () => {
		const open = payment({ id: REFERENCE });
		state.payments = [open];
		expect(await handleIncomingTransfer({ transfer })).toEqual({
			kind: 'handled',
			results: [{ paymentId: REFERENCE, result: 'RECEIVED' }]
		});
		expect(steps).toEqual([
			'read payments',
			'lock transfer',
			'read payments',
			'lock participants',
			'read payments',
			'write status',
			'record transfer',
			'commit',
			'announce transfers'
		]);
		expect(lockPaymentStatus).toHaveBeenCalledWith(
			expect.objectContaining({ participantIds: [`${REFERENCE}-p0`] })
		);
		expect(writePaymentStatus).toHaveBeenCalledWith(
			expect.objectContaining({
				payment: open,
				assignedStatus: 'DONE',
				recievedAt: transfer.bookedAt
			})
		);
		expect(inserted).toHaveBeenCalledWith([
			{
				externalId: 42,
				paymentTransactionId: REFERENCE,
				amount: 50,
				bookedAt: transfer.bookedAt,
				result: 'RECEIVED'
			}
		]);
		expect(announced.payments).toHaveBeenCalledWith([REFERENCE]);
		expect(announced.participants).toHaveBeenCalledWith([`${REFERENCE}-p0`]);
	});

	it('flags everybody a mismatching payment covers for review, without a date', async () => {
		const open = payment({ id: REFERENCE });
		state.payments = [open];
		await handleIncomingTransfer({ transfer: { ...transfer, amount: 20 } });
		expect(writePaymentStatus).toHaveBeenCalledWith(
			expect.objectContaining({
				payment: open,
				assignedStatus: 'NEEDS_HUMAN_REVIEW',
				recievedAt: undefined
			})
		);
	});

	it('does nothing for a transfer it handled before, checked under the transfer lock', async () => {
		state.payments = [payment({ id: REFERENCE })];
		state.handledBefore = true;
		expect(await handleIncomingTransfer({ transfer })).toEqual({ kind: 'handledBefore' });
		expect(steps).toEqual(['read payments', 'lock transfer', 'commit']);
		expect(writePaymentStatus).not.toHaveBeenCalled();
		expect(announced.transfers).not.toHaveBeenCalled();
	});

	it('only tells what it would do on a dry run', async () => {
		state.payments = [payment({ id: REFERENCE })];
		expect(await handleIncomingTransfer({ transfer, dryRun: true })).toEqual({
			kind: 'handled',
			results: [{ paymentId: REFERENCE, result: 'RECEIVED' }]
		});
		expect(steps).toEqual(['read payments']);
		expect(writePaymentStatus).not.toHaveBeenCalled();
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
