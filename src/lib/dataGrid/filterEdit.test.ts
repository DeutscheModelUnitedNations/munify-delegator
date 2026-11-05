import { describe, expect, it } from 'vitest';
import type { ColumnMeta } from './columnTypes';
import {
	activeConditionCount,
	addItem,
	addToGroup,
	changeColumn,
	changeOperator,
	conditionProblem,
	newCondition,
	removeItem,
	replaceCondition,
	setConnective
} from './filterEdit';
import { emptyFilter, type FilterRoot } from './stateSchema';

const city: ColumnMeta = { id: 'city', type: 'text' };
const school: ColumnMeta = { id: 'school', type: 'text' };
const role: ColumnMeta = { id: 'role', type: 'enum', options: ['A', 'B'] };
const columns = [city, school, role];

describe('conditions', () => {
	it('starts with the type’s first operator and no value', () => {
		expect(newCondition(role)).toEqual({ type: 'condition', column: 'role', operator: 'is' });
	});

	it('keeps operator and value on a column of the same kind', () => {
		const condition = { ...newCondition(city), value: 'Berlin' };
		expect(changeColumn({ condition, current: city, next: school })).toEqual({
			...condition,
			column: 'school'
		});
		expect(changeColumn({ condition, current: city, next: role })).toEqual(newCondition(role));
	});

	it('keeps the value when the operator takes the same input', () => {
		const condition = { ...newCondition(role), value: 'A' };
		expect(changeOperator({ condition, column: role, operator: 'isNot' }).value).toBe('A');
		expect(changeOperator({ condition, column: role, operator: 'anyOf' }).value).toBeUndefined();
	});

	it('says why a condition does not count', () => {
		expect(conditionProblem({ condition: newCondition(city), columns })).toBe('incomplete');
		expect(
			conditionProblem({
				condition: { type: 'condition', column: 'gone', operator: 'contains', value: 'x' },
				columns
			})
		).toBe('unknownColumn');
		expect(
			conditionProblem({ condition: { ...newCondition(city), value: 'x' }, columns })
		).toBeUndefined();
	});
});

describe('tree edits', () => {
	const filter: FilterRoot = addItem({
		filter: addItem({ filter: emptyFilter(), item: { ...newCondition(city), value: 'B' } }),
		item: { type: 'group', op: 'or', items: [{ ...newCondition(role), value: 'A' }] }
	});

	it('counts only the conditions that filter', () => {
		expect(activeConditionCount({ filter, columns })).toBe(2);
		const withIncomplete = addToGroup({ filter, index: 1, condition: newCondition(school) });
		expect(activeConditionCount({ filter: withIncomplete, columns })).toBe(2);
	});

	it('replaces a condition inside a group', () => {
		const next = replaceCondition({
			filter,
			address: { index: 1, inner: 0 },
			condition: { ...newCondition(role), value: 'B' }
		});
		expect(next.items[1]).toEqual({
			type: 'group',
			op: 'or',
			items: [{ ...newCondition(role), value: 'B' }]
		});
	});

	it('removes a group left empty', () => {
		expect(removeItem({ filter, address: { index: 1, inner: 0 } }).items).toHaveLength(1);
	});

	it('sets the connective of the top level or a group', () => {
		expect(setConnective({ filter, op: 'or' }).op).toBe('or');
		const group = setConnective({ filter, index: 1, op: 'and' }).items[1];
		expect(group.type === 'group' && group.op).toBe('and');
	});
});
