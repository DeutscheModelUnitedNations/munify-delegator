import { describe, expect, test, vi } from 'vitest';
import type { ColumnFiltersState } from '$lib/components/tanStackTable';

vi.mock('$lib/api/rumbleClient/client', () => ({ client: {} }));

const { waitingListWhere } = await import('./waitingListQuery');

const base = { conferenceId: { eq: 'c1' }, assigned: { eq: false } };

interface Options {
	search?: string;
	hideHidden?: boolean;
	start?: Date | null;
}

function where(
	columnFilters: ColumnFiltersState,
	{ search = '', hideHidden = false, start = new Date(2026, 5, 1) }: Options = {}
) {
	return waitingListWhere('c1', { columnFilters, search }, hideHidden, start);
}

describe('waitingListWhere', () => {
	test('without search or filters only the open entries of the conference are left', () => {
		expect(where([])).toEqual(base);
	});

	test('the toolbar toggle hides the hidden entries', () => {
		expect(where([], { hideHidden: true })).toEqual({ ...base, hidden: { eq: false } });
	});

	test('a filter on the hidden column wins over the toggle', () => {
		expect(where([{ id: 'hidden', value: true }], { hideHidden: true })).toEqual({
			...base,
			hidden: { eq: true }
		});
	});

	test('school and person filters become conditions', () => {
		expect(
			where([
				{ id: 'school', value: { mode: 'equals', value: 'Gymnasium' } },
				{ id: 'email', value: { mode: 'isEmpty', value: '' } },
				{ id: 'city', value: { mode: 'contains', value: '' } }
			])
		).toEqual({
			...base,
			school: { eq: 'Gymnasium' },
			AND: [{ user: { email: { isNull: true } } }]
		});
	});

	test('an age filter needs the conference start', () => {
		const age = { id: 'conferenceAge', value: [16, null] };
		expect(where([age], { start: null })).toEqual(base);
		expect(where([age]).AND).toEqual([{ user: { birthday: { lte: new Date(2010, 5, 1) } } }]);
	});

	test('every search word has to match somewhere', () => {
		const and = where([], { search: 'anna gym' }).AND ?? [];
		expect(and).toHaveLength(2);
		expect(and[1].OR).toContainEqual({ school: { ilike: '%gym%' } });
	});
});
