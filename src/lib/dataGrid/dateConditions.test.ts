import { describe, expect, it } from 'vitest';
import { dateTest, dayOf } from './dateConditions';

describe('dateTest', () => {
	const today = '2026-03-31';

	it('resolves relative spans against today', () => {
		expect(dateTest({ operator: 'inLast', value: { amount: 1, unit: 'months' }, today })).toEqual({
			kind: 'span',
			from: '2026-02-28',
			to: today
		});
		expect(dateTest({ operator: 'thisMonth', value: undefined, today })).toEqual({
			kind: 'span',
			from: '2026-03-01',
			to: '2026-03-31'
		});
	});

	it('knows no unknown operator', () => {
		expect(dateTest({ operator: 'someday', value: undefined, today })).toBeUndefined();
	});
});

describe('dayOf', () => {
	it('reads days and dates', () => {
		expect(dayOf('2026-01-02')).toBe('2026-01-02');
		expect(dayOf(new Date(2026, 0, 2, 13))).toBe('2026-01-02');
		expect(dayOf('')).toBeNull();
		expect(dayOf(3)).toBeNull();
	});
});
