import { describe, expect, test, vi } from 'vitest';
import type { ColumnFiltersState } from '#lib/components/tanStackTable/index.js';

vi.mock('#lib/api/rumbleClient/client.js', () => ({ client: {} }));

const { waitingListWhere } = await import('./waitingListQuery');

const base = { conferenceId: { eq: 'c1' }, assignedAt: { isNull: true } };

interface Options {
	search?: string;
	hideHidden?: boolean;
	showSeated?: boolean;
	start?: Date | null;
	userIds?: string[];
}

function where(
	columnFilters: ColumnFiltersState,
	{
		search = '',
		hideHidden = false,
		showSeated = false,
		start = new Date(2026, 5, 1),
		userIds
	}: Options = {}
) {
	return waitingListWhere(
		'c1',
		{ columnFilters, search },
		{ hideHidden, showSeated },
		start,
		userIds
	);
}

describe('waitingListWhere', () => {
	test('without search or filters only the open entries of the conference are left', () => {
		expect(where([])).toEqual(base);
	});

	test('the seated entries are left out unless the toolbar asks for them', () => {
		expect(where([], { showSeated: true })).toEqual({ conferenceId: { eq: 'c1' } });
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
			school: { name: { eq: 'Gymnasium' } },
			AND: [{ user: { email: { isNull: true } } }]
		});
	});

	test('an age filter needs the conference start', () => {
		const age = { id: 'conferenceAge', value: [16, null] };
		expect(where([age], { start: null })).toEqual(base);
		expect(where([age]).AND).toEqual([{ user: { birthday: { lte: new Date(2010, 5, 1) } } }]);
	});

	test('the search text as typed has to match the person or a text of the entry', () => {
		const and = where([], { search: 'anna gym', userIds: ['u1'] }).AND ?? [];
		expect(and).toHaveLength(1);
		expect(and[0].OR).toContainEqual({ userId: { in: ['u1'] } });
		expect(and[0].OR).toContainEqual({ school: { name: { ilike: '%anna gym%' } } });
	});
});
