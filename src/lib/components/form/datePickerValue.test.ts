import { describe, expect, test } from 'vitest';
import { pickedDate } from './datePickerValue';

describe('pickedDate', () => {
	const day = new Date(2026, 4, 10, 7, 8, 9, 10);

	test('without time, the picked instant as is', () => {
		expect(
			pickedDate({ startDate: day, startDateTime: '12:30', enableTime: false }).getTime()
		).toBe(day.getTime());
	});
	test('with time, the wall-clock time on the picked day', () => {
		expect(pickedDate({ startDate: day, startDateTime: '12:30', enableTime: true })).toEqual(
			new Date(2026, 4, 10, 12, 30, 0, 0)
		);
		expect(pickedDate({ startDate: day, startDateTime: '1:2:3:4', enableTime: true })).toEqual(
			new Date(2026, 4, 10, 1, 2, 3, 4)
		);
	});
	test('accepts timestamps and strings', () => {
		expect(
			pickedDate({ startDate: day.getTime(), startDateTime: '', enableTime: false }).getTime()
		).toBe(day.getTime());
		expect(
			pickedDate({
				startDate: '2026-05-10T00:00:00Z',
				startDateTime: '',
				enableTime: false
			}).toISOString()
		).toBe('2026-05-10T00:00:00.000Z');
	});
	test('does not change the date it was handed', () => {
		const original = new Date(day);
		pickedDate({ startDate: original, startDateTime: '23:59', enableTime: true });
		expect(original.getTime()).toBe(day.getTime());
	});
});
