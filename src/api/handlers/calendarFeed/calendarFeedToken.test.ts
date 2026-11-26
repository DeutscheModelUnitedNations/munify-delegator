// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/private', () => ({ CERTIFICATE_SECRET: 'a secret only the tests know' }));

const { calendarFeedToken, feedIdOfToken } = await import('./calendarFeedToken');

describe('a calendar feed token', () => {
	test('names the feed it was made for', () => {
		expect(feedIdOfToken(calendarFeedToken('feed123'))).toBe('feed123');
	});

	test('is the same every time, so the link can be shown again', () => {
		expect(calendarFeedToken('feed123')).toBe(calendarFeedToken('feed123'));
	});

	test('is refused with a changed MAC', () => {
		const token = calendarFeedToken('feed123');
		const last = token.at(-1) === 'A' ? 'B' : 'A';
		expect(feedIdOfToken(token.slice(0, -1) + last)).toBeUndefined();
	});

	test("is refused for another feed's id with this feed's MAC", () => {
		const mac = calendarFeedToken('feed123').split('.')[1];
		expect(feedIdOfToken(`feed456.${mac}`)).toBeUndefined();
	});

	test('is refused without a MAC or an id', () => {
		expect(feedIdOfToken('feed123')).toBeUndefined();
		expect(feedIdOfToken('feed123.')).toBeUndefined();
		expect(feedIdOfToken(`.${calendarFeedToken('feed123').split('.')[1]}`)).toBeUndefined();
	});
});
