import { describe, expect, test } from 'vitest';
import { hourRange, utcEndHourOf, utcHourOf } from './calendarHours';

const time = (h: number, min = 0) => new Date(Date.UTC(2026, 0, 1, h, min));

describe('utcHourOf', () => {
	test('fractional hours', () => {
		expect(utcHourOf(time(9, 30))).toBe(9.5);
		expect(utcHourOf('2026-01-01T14:15:00Z')).toBe(14.25);
	});
});

describe('utcEndHourOf', () => {
	test('an entry ending at midnight ends at 24', () => {
		expect(
			utcEndHourOf({ startTime: time(20), endTime: new Date(Date.UTC(2026, 0, 2, 0, 0)) })
		).toBe(24);
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
	test('an entry running to midnight extends the day to 24', () => {
		expect(
			hourRange([
				{ startTime: time(11), endTime: time(13) },
				{ startTime: time(20), endTime: new Date(Date.UTC(2026, 0, 2, 0, 0)) }
			])
		).toEqual({ startHour: 11, endHour: 24 });
	});
});
