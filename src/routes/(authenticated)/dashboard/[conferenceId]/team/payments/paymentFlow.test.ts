import { describe, expect, test } from 'vitest';
import { canMarkReceived, transactionReadyFor, transactionStatusUpdate } from './paymentFlow';

describe('transactionReadyFor', () => {
	test('is true once the searched transaction has loaded', () => {
		expect(transactionReadyFor({ searchValue: 't1', transactionId: 't1', fetching: false })).toBe(
			true
		);
	});

	test('is false without a search, for another transaction or while fetching', () => {
		expect(
			transactionReadyFor({ searchValue: '', transactionId: undefined, fetching: false })
		).toBe(false);
		expect(
			transactionReadyFor({ searchValue: null, transactionId: undefined, fetching: false })
		).toBe(false);
		expect(transactionReadyFor({ searchValue: 't1', transactionId: 't0', fetching: false })).toBe(
			false
		);
		expect(transactionReadyFor({ searchValue: 't1', transactionId: 't1', fetching: true })).toBe(
			false
		);
	});
});

describe('canMarkReceived', () => {
	test('needs an open, not yet received transaction and no running action', () => {
		expect(
			canMarkReceived({
				searchValue: 't1',
				transaction: { id: 't1', recievedAt: null },
				busy: false
			})
		).toBe(true);
		expect(canMarkReceived({ searchValue: '', transaction: { id: 't1' }, busy: false })).toBe(
			false
		);
		expect(canMarkReceived({ searchValue: 't1', transaction: undefined, busy: false })).toBe(false);
		expect(
			canMarkReceived({
				searchValue: 't1',
				transaction: { id: 't1', recievedAt: new Date() },
				busy: false
			})
		).toBe(false);
		expect(canMarkReceived({ searchValue: 't1', transaction: { id: 't1' }, busy: true })).toBe(
			false
		);
	});
});

describe('transactionStatusUpdate', () => {
	test('needs a transaction', () => {
		expect(
			transactionStatusUpdate({
				transactionId: undefined,
				status: 'DONE',
				recieveDate: '2026-01-02'
			})
		).toEqual({
			error: 'No transaction id'
		});
	});

	test('needs a date to mark it done', () => {
		expect(
			transactionStatusUpdate({ transactionId: 't1', status: 'DONE', recieveDate: '' })
		).toEqual({ error: 'No date selected' });
	});

	test('sets the status with the received date', () => {
		expect(
			transactionStatusUpdate({ transactionId: 't1', status: 'DONE', recieveDate: '2026-01-02' })
		).toEqual({
			args: { id: 't1', assignedStatus: 'DONE', recievedAt: new Date('2026-01-02') }
		});
	});

	test('other statuses do not need a date', () => {
		expect(
			transactionStatusUpdate({ transactionId: 't1', status: 'PROBLEM', recieveDate: '' })
		).toEqual({
			args: { id: 't1', assignedStatus: 'PROBLEM', recievedAt: undefined }
		});
	});
});
