import { describe, expect, test } from 'vitest';
import { reportCases, waitingSince } from './reportCases';

const report = ({ id, chatId, at }: { id: string; chatId: string; at: string }) => ({
	id,
	chatId,
	reason: id,
	createdAt: at
});

describe('reportCases', () => {
	test('a chat is one case, with its reports oldest first', () => {
		const cases = reportCases([
			report({ id: 'late', chatId: 'a', at: '2026-11-12T22:05:00Z' }),
			report({ id: 'early', chatId: 'a', at: '2026-11-12T21:20:00Z' })
		]);
		expect(cases).toHaveLength(1);
		expect(cases[0]?.reports.map((entry) => entry.id)).toEqual(['early', 'late']);
		expect(cases[0]?.since).toEqual(new Date('2026-11-12T21:20:00Z'));
	});

	test('the chat waiting longest comes first', () => {
		const cases = reportCases([
			report({ id: '1', chatId: 'new', at: '2026-11-12T22:00:00Z' }),
			report({ id: '2', chatId: 'old', at: '2026-11-12T20:00:00Z' }),
			report({ id: '3', chatId: 'new', at: '2026-11-12T23:00:00Z' })
		]);
		expect(cases.map((entry) => entry.chatId)).toEqual(['old', 'new']);
	});

	test('no reports, no cases', () => {
		expect(reportCases([])).toEqual([]);
	});
});

describe('waitingSince', () => {
	const now = new Date('2026-11-12T23:20:00Z');
	const ago = (since: string) => waitingSince({ since: new Date(since), now, locale: 'en' });

	test('takes the largest unit that fits', () => {
		expect(ago('2026-11-12T21:20:00Z')).toBe('2 hr. ago');
		expect(ago('2026-11-12T23:08:00Z')).toBe('12 min. ago');
		expect(ago('2026-11-10T23:00:00Z')).toBe('2 days ago');
	});

	test('just now, also for a clock that runs ahead', () => {
		expect(ago('2026-11-12T23:19:50Z')).toBe('this minute');
		expect(ago('2026-11-12T23:25:00Z')).toBe('this minute');
	});
});
