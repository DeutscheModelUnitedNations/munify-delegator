import { describe, expect, test } from 'vitest';
import { PaperSortState, paperHasReviews, sortPapers, type SortablePaper } from './paperSorting';

type Paper = SortablePaper & { name: string };

function paper(name: string, overrides: Partial<SortablePaper> = {}): Paper {
	return {
		name,
		type: 'POSITION_PAPER',
		status: 'DRAFT',
		createdAt: null,
		updatedAt: null,
		firstSubmittedAt: null,
		delegation: { assignedNation: null, assignedNonStateActor: null },
		...overrides
	};
}

const names = (papers: Paper[]) => papers.map((p) => p.name);

describe('sortPapers', () => {
	const germany = paper('germany', {
		type: 'WORKING_PAPER',
		status: 'SUBMITTED',
		createdAt: new Date('2026-01-03'),
		updatedAt: new Date('2026-02-01'),
		firstSubmittedAt: new Date('2026-01-05'),
		delegation: { assignedNation: { alpha3Code: 'DEU' }, assignedNonStateActor: null }
	});
	const amnesty = paper('amnesty', {
		type: 'INTRODUCTION_PAPER',
		status: 'ACCEPTED',
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-03-01'),
		delegation: { assignedNation: null, assignedNonStateActor: { name: 'Amnesty' } }
	});
	const nobody = paper('nobody', {
		createdAt: new Date('2026-01-02')
	});
	const papers = [germany, amnesty, nobody];

	test('keeps the original order without a config, in a copy', () => {
		const result = sortPapers(papers, null);
		expect(names(result)).toEqual(['germany', 'amnesty', 'nobody']);
		expect(result).not.toBe(papers);
	});

	test('sorts by nation code, falling back to the non-state actor name, then empty', () => {
		expect(names(sortPapers(papers, { key: 'country', direction: 'asc' }))).toEqual([
			'nobody',
			'amnesty',
			'germany'
		]);
		expect(names(sortPapers(papers, { key: 'country', direction: 'desc' }))).toEqual([
			'germany',
			'amnesty',
			'nobody'
		]);
	});

	test('sorts by type and by status', () => {
		expect(names(sortPapers(papers, { key: 'type', direction: 'asc' }))).toEqual([
			'amnesty',
			'nobody',
			'germany'
		]);
		expect(names(sortPapers(papers, { key: 'status', direction: 'desc' }))).toEqual([
			'germany',
			'nobody',
			'amnesty'
		]);
	});

	test('sorts by dates, with missing dates first when ascending', () => {
		expect(names(sortPapers(papers, { key: 'createdAt', direction: 'asc' }))).toEqual([
			'amnesty',
			'nobody',
			'germany'
		]);
		expect(names(sortPapers(papers, { key: 'updatedAt', direction: 'asc' }))).toEqual([
			'nobody',
			'germany',
			'amnesty'
		]);
		expect(names(sortPapers(papers, { key: 'firstSubmittedAt', direction: 'desc' }))).toEqual([
			'germany',
			'amnesty',
			'nobody'
		]);
	});

	test('keeps equal papers in their order', () => {
		const a = paper('a');
		const b = paper('b');
		expect(names(sortPapers([a, b], { key: 'status', direction: 'asc' }))).toEqual(['a', 'b']);
	});
});

describe('paperHasReviews', () => {
	test('is true once any version has a review', () => {
		expect(paperHasReviews({ versions: [{ reviews: [] }, { reviews: [{ id: 'r' }] }] })).toBe(true);
		expect(paperHasReviews({ versions: [{ reviews: [] }] })).toBe(false);
		expect(paperHasReviews({ versions: [] })).toBe(false);
	});
});

describe('PaperSortState', () => {
	test('sorts ascending first, flips on the same column and resets on another', () => {
		const state = new PaperSortState();
		expect(state.get('g')).toBeNull();
		state.toggle('g', 'type');
		expect(state.get('g')).toEqual({ key: 'type', direction: 'asc' });
		state.toggle('g', 'type');
		expect(state.get('g')).toEqual({ key: 'type', direction: 'desc' });
		state.toggle('g', 'type');
		expect(state.get('g')).toEqual({ key: 'type', direction: 'asc' });
		state.toggle('g', 'status');
		expect(state.get('g')).toEqual({ key: 'status', direction: 'asc' });
		expect(state.get('other')).toBeNull();
	});
});
