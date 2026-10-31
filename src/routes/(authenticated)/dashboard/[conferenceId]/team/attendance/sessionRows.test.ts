import { describe, expect, test } from 'vitest';
import { sessionNamed, sessionRows, type ListedSession, type OpenSession } from './sessionRows';

const open = (id: string, name: string, day: number): OpenSession => ({
	id,
	occasion: name,
	startedAt: new Date(2026, 9, day),
	mode: 'CHECK'
});
const listed = (id: string, name: string, day: number, ended = true): ListedSession => ({
	...open(id, name, day),
	endedAt: ended ? new Date(2026, 9, day, 12) : null,
	entryCount: 0,
	showOnCertificate: true
});

describe('sessionRows', () => {
	test('puts running sessions first, then the newest', () => {
		const rows = sessionRows({
			listed: [listed('a', 'Day 1', 1, false), listed('b', 'Day 2', 2), listed('c', 'Day 3', 3)],
			openSessions: [open('a', 'Day 1', 1)]
		});
		expect(rows.map((row) => [row.name, row.open?.id ?? null])).toEqual([
			['Day 1', 'a'],
			['Day 3', null],
			['Day 2', null]
		]);
	});

	test('lists open sessions not listed yet', () => {
		const rows = sessionRows({ listed: [], openSessions: [open('s1', 'Rehearsal', 4)] });
		expect(rows).toEqual([
			{
				id: 's1',
				name: 'Rehearsal',
				startedAt: open('s1', 'Rehearsal', 4).startedAt,
				open: open('s1', 'Rehearsal', 4),
				listed: null
			}
		]);
	});
});

describe('sessionNamed', () => {
	test('finds a name ignoring case and surrounding spaces', () => {
		const sessions = [open('a', 'Opening', 1)];
		expect(sessionNamed({ sessions, name: ' opening ' })?.id).toBe('a');
		expect(sessionNamed({ sessions, name: 'Closing' })).toBeUndefined();
	});
});
