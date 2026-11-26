import { beforeEach, describe, expect, it, vi } from 'vitest';

interface StoredPayment {
	id: string;
	paymentFor: { conferenceParticipantId: string }[];
}

/** What the transaction finds, and what it did, in order. */
const state = vi.hoisted(() => ({
	/** The payment status of the people involved, as their locked rows hold it. */
	people: new Array<{ paymentStatus: string }>(),
	payments: new Array<StoredPayment>(),
	fee: 50 as number | null,
	/** The payment the payer changes, as it is stored. */
	stored: { recievedAt: null as Date | null, discardedAt: null as Date | null },
	/** What the conditional write of a payer's change hits. */
	written: [{ id: 'p' }] as { id: string }[]
}));
const steps = vi.hoisted(() => new Array<string>());
const findPayments = vi.hoisted(() => vi.fn());
const inserted = vi.hoisted(() => vi.fn());
const updated = vi.hoisted(() => vi.fn());
const lockOrder = vi.hoisted(() => vi.fn());
const where = vi.hoisted(() => vi.fn());

vi.mock('#api/db/db', () => {
	const tx = {
		select: () => ({
			from: () => ({
				where: () => ({
					orderBy: (column: unknown) => ({
						for: (strength: string) => {
							steps.push(`lock ${strength}`);
							lockOrder(column);
							return Promise.resolve(state.people);
						}
					})
				})
			})
		}),
		update: () => ({
			set: (values: unknown) => ({
				where: () => {
					steps.push('update');
					updated(values);
					return Promise.resolve();
				}
			})
		}),
		insert: () => ({
			values: (values: unknown) => {
				steps.push('insert');
				inserted(values);
				return Promise.resolve();
			}
		}),
		query: {
			paymentTransaction: {
				findFirst: () => Promise.resolve(undefined),
				findMany: (args: unknown) => {
					steps.push('read payments');
					findPayments(args);
					return Promise.resolve(state.payments);
				}
			}
		}
	};
	return {
		schema: {
			conferenceParticipant: { id: 'participant.id' },
			paymentTransaction: {},
			userReferenceInPaymentTransaction: {}
		},
		db: {
			query: {
				conference: { findFirst: () => Promise.resolve({ feeAmount: state.fee }) },
				paymentTransaction: { findFirst: () => Promise.resolve(state.stored) }
			},
			update: () => ({
				set: (values: unknown) => ({
					where: () => ({
						returning: () => {
							updated(values);
							return Promise.resolve(state.written);
						}
					})
				})
			}),
			transaction: (run: (t: typeof tx) => unknown) => run(tx)
		}
	};
});
vi.mock('#api/db/whereRows', () => ({ whereRows: where }));
vi.mock('drizzle-orm', () => ({ asc: (column: unknown) => `${String(column)} asc` }));

const paymentCreated = vi.hoisted(() => vi.fn());
const coveredCreated = vi.hoisted(() => vi.fn());
const paymentUpdated = vi.hoisted(() => vi.fn());
vi.mock('#api/pubsub', () => ({
	conferenceParticipantPubsub: { updated: vi.fn() },
	paymentTransactionPubsub: { created: paymentCreated, updated: paymentUpdated },
	userReferenceInPaymentTransactionPubsub: { created: coveredCreated }
}));

const {
	applyPaymentStatus,
	createPaymentTransaction,
	discardPaymentTransaction,
	openPaymentProblem,
	paymentCovering,
	reportPaymentTransfer
} = await import('./paymentTransactionService');

const payment = ({ id, covers }: { id: string; covers: string[] }): StoredPayment => ({
	id,
	paymentFor: covers.map((conferenceParticipantId) => ({ conferenceParticipantId }))
});

const create = (paymentFor: string[]) =>
	createPaymentTransaction({ conferenceId: 'conference', payerParticipantId: 'a', paymentFor });

beforeEach(() => {
	state.people = [{ paymentStatus: 'PENDING' }, { paymentStatus: 'PROBLEM' }];
	state.payments = [];
	state.fee = 50;
	state.stored = { recievedAt: null, discardedAt: null };
	state.written = [{ id: 'p' }];
	steps.length = 0;
	vi.clearAllMocks();
});

describe('paymentCovering', () => {
	const payments = [
		payment({ id: 'only-a', covers: ['a'] }),
		payment({ id: 'a-and-b', covers: ['a', 'b'] })
	];

	it('finds the payment for exactly these people, in any order', () => {
		expect(paymentCovering({ payments, paymentFor: ['b', 'a'] })?.id).toBe('a-and-b');
		expect(paymentCovering({ payments, paymentFor: ['a'] })?.id).toBe('only-a');
	});

	it('finds none for fewer, more or other people', () => {
		expect(paymentCovering({ payments, paymentFor: ['b'] })).toBeUndefined();
		expect(paymentCovering({ payments, paymentFor: ['a', 'b', 'c'] })).toBeUndefined();
		expect(paymentCovering({ payments, paymentFor: ['a', 'c'] })).toBeUndefined();
	});

	it('takes the first of several', () => {
		const twice = [payment({ id: 'newer', covers: ['a'] }), ...payments];
		expect(paymentCovering({ payments: twice, paymentFor: ['a'] })?.id).toBe('newer');
	});
});

describe('createPaymentTransaction', () => {
	it('returns the payer’s open reference for the same people instead of a new one', async () => {
		state.payments = [payment({ id: 'existing', covers: ['a', 'b'] })];

		expect(await create(['b', 'a'])).toBe('existing');
		expect(inserted).not.toHaveBeenCalled();
		expect(paymentCreated).not.toHaveBeenCalled();
		expect(coveredCreated).not.toHaveBeenCalled();
	});

	it('looks only at the payer’s references of this amount that have not arrived and were not given up, newest first', async () => {
		await create(['a', 'b']);

		expect(findPayments).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					payerParticipantId: 'a',
					amount: 100,
					recievedAt: { isNull: true },
					discardedAt: { isNull: true }
				},
				orderBy: { createdAt: 'desc' }
			})
		);
	});

	it('creates a reference for other people, after locking everybody involved', async () => {
		state.payments = [payment({ id: 'existing', covers: ['a'] })];

		const id = await create(['a', 'b']);

		expect(id).toMatch(/^([A-Z0-9]{4}-){3}[A-Z0-9]{4}$/);
		expect(inserted).toHaveBeenCalledWith({ id, amount: 100, payerParticipantId: 'a' });
		expect(inserted).toHaveBeenCalledWith([
			{ paymentTransactionId: id, conferenceParticipantId: 'a' },
			{ paymentTransactionId: id, conferenceParticipantId: 'b' }
		]);
		expect(steps).toEqual(['lock no key update', 'read payments', 'insert', 'insert']);
		expect(lockOrder).toHaveBeenCalledWith('participant.id asc');
		expect(paymentCreated).toHaveBeenCalledOnce();
		expect(coveredCreated).toHaveBeenCalledOnce();
	});

	it('locks people who have not paid as well, so one marked paid meanwhile is seen', async () => {
		await create(['b']);

		expect(where).toHaveBeenCalledWith(
			expect.objectContaining({ filter: { id: { in: ['a', 'b'] } } })
		);
	});

	it('refuses when somebody has paid, even with an open reference', async () => {
		state.people = [{ paymentStatus: 'PENDING' }, { paymentStatus: 'DONE' }];
		state.payments = [payment({ id: 'existing', covers: ['a', 'b'] })];

		await expect(create(['a', 'b'])).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		expect(steps).toEqual(['lock no key update']);
	});

	it('refuses while the conference has no fee', async () => {
		state.fee = null;

		await expect(create(['a'])).rejects.toMatchObject({ extensions: { code: 'INVALID_INPUT' } });
	});
});

describe('applyPaymentStatus', () => {
	it('locks everybody covered, in the same order, before writing', async () => {
		await applyPaymentStatus({
			payment: payment({ id: 'existing', covers: ['b', 'a'] }),
			assignedStatus: 'DONE',
			recievedAt: undefined
		});

		expect(steps).toEqual(['lock no key update', 'update', 'update']);
		expect(lockOrder).toHaveBeenCalledWith('participant.id asc');
		expect(updated).toHaveBeenLastCalledWith({ paymentStatus: 'DONE' });
	});

	it('locks nobody for a payment that covers nobody any more', async () => {
		await applyPaymentStatus({
			payment: payment({ id: 'existing', covers: [] }),
			assignedStatus: 'PROBLEM',
			recievedAt: undefined
		});

		expect(steps).toEqual([]);
	});
});

describe('openPaymentProblem', () => {
	it('says why the payer can no longer change a payment', () => {
		expect(openPaymentProblem({ recievedAt: null, discardedAt: null })).toBeUndefined();
		expect(openPaymentProblem({ recievedAt: new Date(), discardedAt: null })).toBe('RECEIVED');
		expect(openPaymentProblem({ recievedAt: null, discardedAt: new Date() })).toBe('DISCARDED');
		// money that arrived on a discarded reference is what counts
		expect(openPaymentProblem({ recievedAt: new Date(), discardedAt: new Date() })).toBe(
			'RECEIVED'
		);
	});
});

describe('reportPaymentTransfer', () => {
	it('keeps when the payer said they transferred, and clears it when they take it back', async () => {
		await reportPaymentTransfer({ id: 'p', reported: true });
		expect(updated).toHaveBeenLastCalledWith(
			expect.objectContaining({ transferReportedAt: expect.any(Date) })
		);

		await reportPaymentTransfer({ id: 'p', reported: false });
		expect(updated).toHaveBeenLastCalledWith(expect.objectContaining({ transferReportedAt: null }));
		expect(paymentUpdated).toHaveBeenCalledWith('p');
	});

	it('refuses once the money arrived or the reference was given up', async () => {
		state.stored = { recievedAt: new Date(), discardedAt: null };
		await expect(reportPaymentTransfer({ id: 'p', reported: true })).rejects.toMatchObject({
			extensions: { code: 'CONFLICT' }
		});

		state.stored = { recievedAt: null, discardedAt: new Date() };
		await expect(reportPaymentTransfer({ id: 'p', reported: false })).rejects.toMatchObject({
			extensions: { code: 'CONFLICT' }
		});
		expect(updated).not.toHaveBeenCalled();
	});

	it('refuses when the payment changed between reading and writing it', async () => {
		state.written = [];
		await expect(reportPaymentTransfer({ id: 'p', reported: true })).rejects.toMatchObject({
			extensions: { code: 'CONFLICT' }
		});
		expect(paymentUpdated).not.toHaveBeenCalled();
	});
});

describe('discardPaymentTransaction', () => {
	it('marks the reference given up and keeps it', async () => {
		await discardPaymentTransaction('p');

		expect(updated).toHaveBeenCalledWith(
			expect.objectContaining({ discardedAt: expect.any(Date) })
		);
		expect(paymentUpdated).toHaveBeenCalledWith('p');
	});

	it('refuses a reference whose money arrived', async () => {
		state.stored = { recievedAt: new Date(), discardedAt: null };
		await expect(discardPaymentTransaction('p')).rejects.toMatchObject({
			extensions: { code: 'CONFLICT' }
		});
	});
});
