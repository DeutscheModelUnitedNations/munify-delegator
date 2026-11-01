import { describe, expect, it } from 'vitest';
import { fromCalendarDay, toCalendarDay } from './calendarDay';

describe('calendarDay', () => {
	it('sends the picked local day as UTC midnight', () => {
		const picked = new Date(2008, 4, 4);
		expect(toCalendarDay(picked).toISOString()).toBe('2008-05-04T00:00:00.000Z');
	});

	it('shows a stored day as local midnight of the same day', () => {
		const shown = fromCalendarDay(new Date('2008-05-04T00:00:00.000Z'));
		expect([shown.getFullYear(), shown.getMonth(), shown.getDate()]).toEqual([2008, 4, 4]);
		expect([shown.getHours(), shown.getMinutes()]).toEqual([0, 0]);
	});

	it('round-trips', () => {
		const picked = new Date(1999, 11, 31);
		expect(fromCalendarDay(toCalendarDay(picked)).getTime()).toBe(picked.getTime());
	});
});
