import { describe, expect, it } from 'vitest';
import { groupValueOf, isGroupOpen, orderGroups, toggleGroup } from './grouping';

describe('groupValueOf', () => {
	it('names groups the way the SQL engine does', () => {
		const date = { id: 'd', type: 'date' as const };
		expect(groupValueOf({ column: date, groupBy: { column: 'd' }, value: '2026-03-04' })).toBe(
			'2026-03'
		);
		expect(
			groupValueOf({ column: date, groupBy: { column: 'd', bucket: 'year' }, value: '2026-03-04' })
		).toBe('2026');
		const number = { id: 'n', type: 'number' as const };
		expect(groupValueOf({ column: number, groupBy: { column: 'n', step: 10 }, value: 17 })).toBe(
			'10'
		);
		expect(groupValueOf({ column: number, groupBy: { column: 'n' }, value: 17 })).toBe('17');
		const bool = { id: 'b', type: 'boolean' as const };
		expect(groupValueOf({ column: bool, groupBy: { column: 'b' }, value: false })).toBe('false');
		expect(groupValueOf({ column: bool, groupBy: { column: 'b' }, value: null })).toBeNull();
	});
});

describe('collapse state', () => {
	it('flips one group against the default', () => {
		const display = { collapsed: false, toggled: [] };
		expect(isGroupOpen({ path: ['a'], display })).toBe(true);
		const closed = toggleGroup({ path: ['a'], display });
		expect(isGroupOpen({ path: ['a'], display: closed })).toBe(false);
		expect(isGroupOpen({ path: ['b'], display: closed })).toBe(true);
		expect(
			isGroupOpen({ path: ['a'], display: toggleGroup({ path: ['a'], display: closed }) })
		).toBe(true);
		expect(isGroupOpen({ path: ['a'], display: { collapsed: true, toggled: [] } })).toBe(false);
	});
});

describe('orderGroups', () => {
	it('orders enums by their options and empty groups last', () => {
		const column = { id: 'r', type: 'enum' as const, options: ['B', 'A'] };
		const groups = [
			{ value: null, count: 1 },
			{ value: 'A', count: 2 },
			{ value: 'B', count: 3 }
		];
		expect(orderGroups({ groups, column, desc: false }).map((g) => g.value)).toEqual([
			'B',
			'A',
			null
		]);
		expect(orderGroups({ groups, column, desc: true }).map((g) => g.value)).toEqual([
			'A',
			'B',
			null
		]);
	});

	it('orders numbers as numbers', () => {
		const column = { id: 'n', type: 'number' as const };
		const groups = ['100', '20', '3'].map((value) => ({ value, count: 1 }));
		expect(orderGroups({ groups, column, desc: false }).map((g) => g.value)).toEqual([
			'3',
			'20',
			'100'
		]);
	});
});
