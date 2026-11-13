import { describe, expect, test } from 'vitest';
import { dayLabel, groupByDay, listTime } from './chatTime';

const now = new Date(2026, 10, 12, 15, 0);
const at = (day: number, hour = 12) => new Date(2026, 10, day, hour, 30);

describe('listTime', () => {
	test('says the time today, then the day', () => {
		expect(listTime({ date: at(12, 9), now, locale: 'de' })).toBe('09:30');
		expect(listTime({ date: at(11), now, locale: 'de' })).toBe('Gestern');
		expect(listTime({ date: at(9), now, locale: 'de' })).toBe('Mo');
		expect(listTime({ date: at(1), now, locale: 'de' })).toBe('01.11.26');
	});
});

describe('dayLabel', () => {
	test('names today and yesterday, then the date, with the year when it is another', () => {
		expect(dayLabel({ date: at(12), now, locale: 'de' })).toBe('Heute');
		expect(dayLabel({ date: at(11), now, locale: 'de' })).toBe('Gestern');
		expect(dayLabel({ date: at(3), now, locale: 'de' })).toBe('Dienstag, 3. November');
		expect(dayLabel({ date: new Date(2025, 11, 24), now, locale: 'de' })).toContain('2025');
	});
});

describe('groupByDay', () => {
	test('keeps the order and starts a group at every new day', () => {
		const messages = [
			{ id: 'a', createdAt: at(10, 9) },
			{ id: 'b', createdAt: at(10, 18) },
			{ id: 'c', createdAt: at(11, 8).toISOString() }
		];
		const days = groupByDay(messages);
		expect(days.map((day) => day.messages.map((message) => message.id))).toEqual([
			['a', 'b'],
			['c']
		]);
	});
});
