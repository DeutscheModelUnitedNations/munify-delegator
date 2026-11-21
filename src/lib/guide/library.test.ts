import { describe, expect, test } from 'vitest';
import { filterLibrary, guidePageState, stateCounts, type LibraryRow } from './library';

describe('guidePageState', () => {
	test('a page never published is a draft', () => {
		expect(guidePageState({ publishedAt: null, draftUpdatedAt: '2026-01-01' })).toBe('DRAFT');
	});

	test('a draft changed after the publish has changes', () => {
		expect(
			guidePageState({ publishedAt: '2026-01-01T10:00Z', draftUpdatedAt: '2026-01-01T11:00Z' })
		).toBe('CHANGED');
		expect(
			guidePageState({ publishedAt: '2026-01-01T12:00Z', draftUpdatedAt: '2026-01-01T11:00Z' })
		).toBe('PUBLISHED');
	});
});

const rows: LibraryRow[] = [
	{ id: 'top', title: 'TOP 1', kind: 'AGENDA_ITEM', scope: 'CONFERENCE', state: 'DRAFT' },
	{ id: 'b', title: 'Begriffe', kind: 'GENERAL', scope: 'EVERYWHERE', state: 'PUBLISHED' },
	{ id: 'a', title: 'Ablauf', kind: 'GENERAL', scope: 'CONFERENCE', state: 'CHANGED' }
];

test('filterLibrary keeps general pages first and filters by scope and state', () => {
	const all = filterLibrary({ rows, filter: { scope: null, state: null }, locale: 'de' });
	expect(all.map((row) => row.id)).toEqual(['a', 'b', 'top']);
	expect(
		filterLibrary({ rows, filter: { scope: 'CONFERENCE', state: null }, locale: 'de' }).map(
			(row) => row.id
		)
	).toEqual(['a', 'top']);
	expect(
		filterLibrary({ rows, filter: { scope: null, state: 'DRAFT' }, locale: 'de' }).map(
			(row) => row.id
		)
	).toEqual(['top']);
});

test('stateCounts counts each state', () => {
	expect(stateCounts(rows)).toEqual({ DRAFT: 1, PUBLISHED: 1, CHANGED: 1 });
});
