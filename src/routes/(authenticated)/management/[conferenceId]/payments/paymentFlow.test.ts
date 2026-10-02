import { describe, expect, test } from 'vitest';
import { canMarkReceived, transactionReadyFor, transactionStatusUpdate } from './paymentFlow';

describe('transactionReadyFor', () => {
	test('is true once the searched transaction has loaded', () => {
		expect(transactionReadyFor('t1', 't1', false)).toBe(true);
	});

	test('is false without a search, for another transaction or while fetching', () => {
		expect(transactionReadyFor('', undefined, false)).toBe(false);
		expect(transactionReadyFor(null, undefined, false)).toBe(false);
		expect(transactionReadyFor('t1', 't0', false)).toBe(false);
		expect(transactionReadyFor('t1', 't1', true)).toBe(false);
	});
});

describe('canMarkReceived', () => {
	test('needs an open, not yet received transaction and no running action', () => {
		expect(canMarkReceived('t1', { id: 't1', recievedAt: null }, false)).toBe(true);
		expect(canMarkReceived('', { id: 't1' }, false)).toBe(false);
		expect(canMarkReceived('t1', undefined, false)).toBe(false);
		expect(canMarkReceived('t1', { id: 't1', recievedAt: new Date() }, false)).toBe(false);
		expect(canMarkReceived('t1', { id: 't1' }, true)).toBe(false);
	});
});

describe('transactionStatusUpdate', () => {
	test('needs a transaction', () => {
		expect(transactionStatusUpdate(undefined, 'DONE', '2026-01-02')).toEqual({
			error: 'No transaction id'
		});
	});

	test('needs a date to mark it done', () => {
		expect(transactionStatusUpdate('t1', 'DONE', '')).toEqual({ error: 'No date selected' });
	});

	test('sets the status with the received date', () => {
		expect(transactionStatusUpdate('t1', 'DONE', '2026-01-02')).toEqual({
			args: { id: 't1', assignedStatus: 'DONE', recievedAt: new Date('2026-01-02') }
		});
	});

	test('other statuses do not need a date', () => {
		expect(transactionStatusUpdate('t1', 'PROBLEM', '')).toEqual({
			args: { id: 't1', assignedStatus: 'PROBLEM', recievedAt: undefined }
		});
	});
});
