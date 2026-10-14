import { describe, expect, test } from 'vitest';
import { pickedDate } from './datePickerValue';

describe('pickedDate', () => {
	const day = new Date(2026, 4, 10, 7, 8, 9, 10);

	test('without time, the picked instant as is', () => {
		expect(pickedDate(day, '12:30', false).getTime()).toBe(day.getTime());
	});
	test('with time, the wall-clock time on the picked day', () => {
		expect(pickedDate(day, '12:30', true)).toEqual(new Date(2026, 4, 10, 12, 30, 0, 0));
		expect(pickedDate(day, '1:2:3:4', true)).toEqual(new Date(2026, 4, 10, 1, 2, 3, 4));
	});
	test('accepts timestamps and strings', () => {
		expect(pickedDate(day.getTime(), '', false).getTime()).toBe(day.getTime());
		expect(pickedDate('2026-05-10T00:00:00Z', '', false).toISOString()).toBe(
			'2026-05-10T00:00:00.000Z'
		);
	});
	test('does not change the date it was handed', () => {
		const original = new Date(day);
		pickedDate(original, '23:59', true);
		expect(original.getTime()).toBe(day.getTime());
	});
});
