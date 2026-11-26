import { describe, expect, test } from 'vitest';
import { googleCalendarSubscribeUrl, webcalUrl } from './calendarExport';

describe('webcalUrl', () => {
	test('swaps the scheme for webcal', () => {
		expect(webcalUrl('https://app.example/calendar/a.b.ics')).toBe(
			'webcal://app.example/calendar/a.b.ics'
		);
		expect(webcalUrl('http://localhost:5173/calendar/a.b.ics')).toBe(
			'webcal://localhost:5173/calendar/a.b.ics'
		);
	});
});

describe('googleCalendarSubscribeUrl', () => {
	test("hands Google the feed's webcal link", () => {
		const url = new URL(googleCalendarSubscribeUrl('https://app.example/calendar/a.b.ics'));
		expect(url.origin).toBe('https://calendar.google.com');
		expect(url.searchParams.get('cid')).toBe('webcal://app.example/calendar/a.b.ics');
	});
});
