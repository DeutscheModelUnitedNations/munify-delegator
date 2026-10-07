import { describe, expect, test } from 'vitest';
import { hourRange, utcHourOf } from './calendarHours';

const time = (h: number, min = 0) => new Date(Date.UTC(2026, 0, 1, h, min));

describe('utcHourOf', () => {
	test('fractional hours', () => {
		expect(utcHourOf(time(9, 30))).toBe(9.5);
		expect(utcHourOf('2026-01-01T14:15:00Z')).toBe(14.25);
	});
});

describe('hourRange', () => {
	test('a day without entries', () => {
		expect(hourRange([])).toEqual({ startHour: 8, endHour: 18 });
	});
	test('earliest start rounded down, latest end rounded up', () => {
		expect(
			hourRange([
				{ startTime: time(10), endTime: time(11) },
				{ startTime: time(9, 30), endTime: time(16, 10) },
				{ startTime: time(12), endTime: time(13) }
			])
		).toEqual({ startHour: 9, endHour: 17 });
	});
});
