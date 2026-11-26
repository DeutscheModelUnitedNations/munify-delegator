import { describe, expect, test } from 'vitest';
import { formatMoney, paymentDeadlineState } from './paymentFormat';

describe('formatMoney', () => {
	test('writes the amount as the locale does', () => {
		expect(formatMoney({ amount: 375, currency: 'EUR', locale: 'de' })).toBe('375,00\u00a0€');
		expect(formatMoney({ amount: 375, currency: 'EUR', locale: 'en' })).toBe('€375.00');
	});

	test('falls back to the code for a currency Intl does not know', () => {
		expect(formatMoney({ amount: 5, currency: 'X', locale: 'de' })).toBe('5.00 X');
	});
});

describe('paymentDeadlineState', () => {
	const now = new Date('2027-02-10T12:00:00Z');

	test('is open before the deadline and overdue after it', () => {
		expect(paymentDeadlineState({ deadline: new Date('2027-02-15T00:00:00Z'), now })).toBe('open');
		expect(paymentDeadlineState({ deadline: new Date('2027-02-01T00:00:00Z'), now })).toBe(
			'overdue'
		);
	});

	test('says nothing without a deadline', () => {
		expect(paymentDeadlineState({ deadline: null, now })).toBeUndefined();
	});
});
