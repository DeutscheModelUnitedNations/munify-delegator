import { describe, expect, test } from 'vitest';
import { sessionRows, type Occasion, type OpenSession } from './sessionRows';

const occasion = (name: string, day: number): Occasion => ({
	name,
	sessions: 1,
	entries: 0,
	firstStartedAt: new Date(2026, 9, day),
	showOnCertificate: true
});
const open = (id: string, name: string, day: number): OpenSession => ({
	id,
	occasion: name,
	startedAt: new Date(2026, 9, day),
	mode: 'CHECK'
});

describe('sessionRows', () => {
	test('puts running occasions first, then the newest', () => {
		const rows = sessionRows(
			[occasion('Day 1', 1), occasion('Day 2', 2), occasion('Day 3', 3)],
			[open('s1', 'day 1 ', 1)]
		);
		expect(rows.map((row) => [row.name, row.open?.id ?? null])).toEqual([
			['Day 1', 's1'],
			['Day 3', null],
			['Day 2', null]
		]);
	});

	test('an occasion with several open sessions joins the latest', () => {
		const rows = sessionRows(
			[occasion('Day 1', 1)],
			[open('a', 'Day 1', 1), open('b', 'Day 1', 2)]
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].open?.id).toBe('b');
	});

	test('lists open sessions whose occasion is not known', () => {
		const rows = sessionRows([], [open('s1', 'Rehearsal', 4)]);
		expect(rows).toEqual([
			{ key: 'rehearsal', name: 'Rehearsal', occasion: null, open: open('s1', 'Rehearsal', 4) }
		]);
	});
});
