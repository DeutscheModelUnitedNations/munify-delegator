import { describe, expect, test } from 'vitest';
import {
	booleanFilter,
	enumFilter,
	fetchEveryRow,
	orderFrom,
	rangeFilter,
	searchWords,
	stringFilter
} from './serverQuery';

describe('searchWords', () => {
	test('splits on whitespace and caps the count', () => {
		expect(searchWords('  anna   schmidt ')).toEqual(['anna', 'schmidt']);
		expect(searchWords('a b c d e f g', 3)).toEqual(['a', 'b', 'c']);
	});
});

describe('orderFrom', () => {
	type Order = { school?: 'asc' | 'desc'; id?: 'asc' | 'desc' };
	const orders = { school: (direction: 'asc' | 'desc'): Order => ({ school: direction }) };
	test('merges the sortable columns ahead of the fallback', () => {
		const order = orderFrom(
			[
				{ id: 'school', desc: true },
				{ id: 'unknown', desc: false }
			],
			orders,
			{ id: 'asc' }
		);
		expect(order).toEqual({ school: 'desc', id: 'asc' });
		expect(Object.keys(order)).toEqual(['school', 'id']);
	});
});

describe('filters', () => {
	test('text filters become rumble string filters, escaped', () => {
		expect(stringFilter({ mode: 'contains', value: '50%' })).toEqual({ ilike: '%50\\%%' });
		expect(stringFilter({ mode: 'startsWith', value: 'ab' })).toEqual({ ilike: 'ab%' });
		expect(stringFilter({ mode: 'equalsNot', value: 'x' })).toEqual({ ne: 'x' });
		expect(stringFilter({ mode: 'isEmpty', value: '' })).toEqual({ isNull: true });
		expect(stringFilter({ mode: 'contains', value: '' })).toBeUndefined();
		expect(stringFilter('nonsense')).toBeUndefined();
	});
	test('boolean, enum and range filters ignore what they cannot read', () => {
		expect(booleanFilter(true)).toBe(true);
		expect(booleanFilter(null)).toBeUndefined();
		expect(enumFilter(['a', 1, 'b'])).toEqual(['a', 'b']);
		expect(enumFilter(undefined)).toEqual([]);
		expect(rangeFilter([3, null])).toEqual({ gte: 3 });
		expect(rangeFilter([null, null])).toBeUndefined();
	});
});

describe('fetchEveryRow', () => {
	test('pages until a short page', async () => {
		const calls: number[] = [];
		const rows = await fetchEveryRow(async ({ limit, offset }) => {
			calls.push(offset);
			return offset < 1000 ? Array.from({ length: limit }, (_, i) => offset + i) : [offset];
		});
		expect(calls).toEqual([0, 1000]);
		expect(rows).toHaveLength(1001);
	});
});
