import { describe, expect, it } from 'vitest';
import type { FilterRoot } from '#lib/dataGrid/stateSchema';
import {
	OPEN_ISSUES,
	WAITING_LIST,
	isQuickFilterOn,
	participantsBase,
	toggleQuickFilter
} from './quickFilters';

const city = { type: 'condition' as const, column: 'city', operator: 'contains', value: 'B' };
const school = { type: 'condition' as const, column: 'school', operator: 'contains', value: 'X' };

describe('quick filters', () => {
	it('switch on and off, keeping the rest of the filter', () => {
		const filter: FilterRoot = { type: 'group', op: 'and', items: [city] };
		const on = toggleQuickFilter({ filter, quick: OPEN_ISSUES, on: true });
		expect(isQuickFilterOn({ filter: on, quick: OPEN_ISSUES })).toBe(true);
		expect(on.items).toContainEqual(city);
		const off = toggleQuickFilter({ filter: on, quick: OPEN_ISSUES, on: false });
		expect(off).toEqual(filter);
	});

	it('replace the conditions they contradict', () => {
		const issues = toggleQuickFilter({
			filter: participantsBase('ACTIVE').filter!,
			quick: OPEN_ISSUES,
			on: true
		});
		const waiting = toggleQuickFilter({ filter: issues, quick: WAITING_LIST, on: true });
		expect(isQuickFilterOn({ filter: waiting, quick: OPEN_ISSUES })).toBe(false);
		expect(waiting.items).toEqual(WAITING_LIST.conditions);
	});

	it('keep an OR of conditions as a group of its own', () => {
		const filter: FilterRoot = { type: 'group', op: 'or', items: [city, school] };
		const on = toggleQuickFilter({ filter, quick: WAITING_LIST, on: true });
		expect(on.op).toBe('and');
		expect(on.items[0]).toEqual({ type: 'group', op: 'or', items: [city, school] });
	});
});

describe('participantsBase', () => {
	it('shows only the accepted once the conference is underway', () => {
		expect(participantsBase('PARTICIPANT_REGISTRATION').filter?.items).toEqual([]);
		expect(participantsBase('ACTIVE').filter?.items).toHaveLength(1);
	});
});
