import { describe, expect, test } from 'vitest';
import { m } from '$lib/paraglide/messages';
import { formatRelativeTime } from './relativeTime';

const now = 1_000_000_000;
const ago = (seconds: number) => now - seconds * 1000;

describe('formatRelativeTime', () => {
	test('no timestamp', () => {
		expect(formatRelativeTime(undefined, now)).toBe('');
		expect(formatRelativeTime(0, now)).toBe('');
	});
	test.each([
		[59, m.timeAgoSeconds({ count: 59 })],
		[60, m.timeAgoMinutes({ count: 1 })],
		[59 * 60 + 59, m.timeAgoMinutes({ count: 59 })],
		[3600, m.timeAgoHours({ count: 1 })],
		[23 * 3600, m.timeAgoHours({ count: 23 })],
		[24 * 3600, m.timeAgoDays({ count: 1 })],
		[50 * 24 * 3600, m.timeAgoDays({ count: 50 })]
	])('%i seconds ago', (seconds, expected) => {
		expect(formatRelativeTime(ago(seconds), now)).toBe(expected);
	});
	test('defaults to now', () => {
		expect(formatRelativeTime(Date.now())).toBe(m.timeAgoSeconds({ count: 0 }));
	});
});
