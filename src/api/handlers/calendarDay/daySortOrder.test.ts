import { describe, expect, test } from 'vitest';
import { daySortOrder } from './daySortOrder';

const day = (date: string, sortOrder: number) => ({ date: new Date(date), sortOrder });

describe('daySortOrder', () => {
	test('goes first without other days', () => {
		expect(daySortOrder({ date: new Date('2026-03-12'), others: [] })).toBe(0);
	});

	test('goes after the last earlier day', () => {
		expect(
			daySortOrder({
				date: new Date('2026-03-14'),
				others: [day('2026-03-12', 0), day('2026-03-13', 1)]
			})
		).toBe(2);
	});

	test('goes before the first later day when none is earlier', () => {
		expect(daySortOrder({ date: new Date('2026-03-10'), others: [day('2026-03-12', 5)] })).toBe(4);
	});

	test('goes last when its place between two days is taken', () => {
		const others = [day('2026-03-12', 0), day('2026-03-14', 1)];
		expect(daySortOrder({ date: new Date('2026-03-13'), others })).toBe(2);
	});

	test('two days on one date still get different orders', () => {
		expect(daySortOrder({ date: new Date('2026-03-12'), others: [day('2026-03-12', 0)] })).toBe(1);
	});

	test('a day moved to a later date is placed among the others anew', () => {
		// the day that was second (order 1) moves past the third
		expect(
			daySortOrder({
				date: new Date('2026-03-20'),
				others: [day('2026-03-12', 0), day('2026-03-14', 2)]
			})
		).toBe(3);
	});
});
