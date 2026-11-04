import { isFilterable, type ColumnMeta } from './columnTypes';
import { defaultOperator, findOperator, isComplete } from './operators';
import {
	MAX_FILTER_ITEMS,
	countFilterItems,
	type Connective,
	type FilterCondition,
	type FilterItem,
	type FilterRoot
} from './stateSchema';

/**
 * Building a filter: new conditions, changing a condition's column or operator, the tree edits of
 * the builder, and why a condition does not count. All of it returns new values; nothing mutates.
 */

/** Why a condition filters nothing, or `undefined` when it does. */
export type ConditionProblem = 'unknownColumn' | 'unknownOperator' | 'incomplete';

/** A fresh condition on a column, with the column's first operator and no value. */
export function newCondition(column: ColumnMeta): FilterCondition {
	return { type: 'condition', column: column.id, operator: defaultOperator(column.type) };
}

/**
 * Another column for a condition. With the same type and options, operator and value still fit;
 * otherwise the condition starts over.
 */
export function changeColumn({
	condition,
	current,
	next
}: {
	condition: FilterCondition;
	current: ColumnMeta | undefined;
	next: ColumnMeta;
}): FilterCondition {
	const compatible =
		current?.type === next.type &&
		JSON.stringify(current.options ?? []) === JSON.stringify(next.options ?? []);
	return compatible ? { ...condition, column: next.id } : newCondition(next);
}

/** Another operator; the value stays when the input is the same kind ("is" → "is not"). */
export function changeOperator({
	condition,
	column,
	operator
}: {
	condition: FilterCondition;
	column: ColumnMeta;
	operator: string;
}): FilterCondition {
	const before = findOperator({ type: column.type, id: condition.operator })?.input;
	const after = findOperator({ type: column.type, id: operator })?.input;
	const next: FilterCondition = { type: 'condition', column: condition.column, operator };
	return before === after && condition.value !== undefined
		? { ...next, value: condition.value }
		: next;
}

/** Why a condition does not count, for the builder; `undefined` when it does. */
export function conditionProblem({
	condition,
	columns
}: {
	condition: FilterCondition;
	columns: readonly ColumnMeta[];
}): ConditionProblem | undefined {
	const column = columns.find((candidate) => candidate.id === condition.column);
	if (!column || !isFilterable(column)) return 'unknownColumn';
	const operator = findOperator({ type: column.type, id: condition.operator });
	if (!operator) return 'unknownOperator';
	if (!isComplete({ input: operator.input, value: condition.value })) return 'incomplete';
	return undefined;
}

/** How many conditions actually filter, for the count on the filter button. */
export function activeConditionCount({
	filter,
	columns
}: {
	filter: FilterRoot;
	columns: readonly ColumnMeta[];
}) {
	const counts = (condition: FilterCondition) =>
		conditionProblem({ condition, columns }) === undefined ? 1 : 0;
	return filter.items.reduce(
		(sum, item) =>
			sum +
			(item.type === 'condition'
				? counts(item)
				: item.items.reduce((inner, condition) => inner + counts(condition), 0)),
		0
	);
}

/** Whether another condition or group still fits into the filter. */
export function canAddItem(filter: FilterRoot) {
	return countFilterItems(filter) < MAX_FILTER_ITEMS;
}

/** The address of a condition: its index at the top, and within a group the index inside. */
export type ItemAddress = { index: number; inner?: number };

function replaceAt<T>({ list, index, item }: { list: readonly T[]; index: number; item: T }) {
	return list.map((entry, i) => (i === index ? item : entry));
}

/** The filter with an item appended at the top. */
export function addItem({ filter, item }: { filter: FilterRoot; item: FilterItem }): FilterRoot {
	if (!canAddItem(filter)) return filter;
	return { ...filter, items: [...filter.items, item] };
}

/** The filter with a condition appended to the group at `index`. */
export function addToGroup({
	filter,
	index,
	condition
}: {
	filter: FilterRoot;
	index: number;
	condition: FilterCondition;
}): FilterRoot {
	const group = filter.items[index];
	if (!canAddItem(filter) || group?.type !== 'group') return filter;
	return {
		...filter,
		items: replaceAt({
			list: filter.items,
			index,
			item: { ...group, items: [...group.items, condition] }
		})
	};
}

/** The filter with the condition at `address` replaced. */
export function replaceCondition({
	filter,
	address,
	condition
}: {
	filter: FilterRoot;
	address: ItemAddress;
	condition: FilterCondition;
}): FilterRoot {
	const item = filter.items[address.index];
	if (!item) return filter;
	if (address.inner === undefined) {
		return {
			...filter,
			items: replaceAt({ list: filter.items, index: address.index, item: condition })
		};
	}
	if (item.type !== 'group') return filter;
	const items = replaceAt({ list: item.items, index: address.inner, item: condition });
	return {
		...filter,
		items: replaceAt({ list: filter.items, index: address.index, item: { ...item, items } })
	};
}

/** The filter without the item at `address`; a group left empty goes too. */
export function removeItem({
	filter,
	address
}: {
	filter: FilterRoot;
	address: ItemAddress;
}): FilterRoot {
	const item = filter.items[address.index];
	if (!item) return filter;
	if (address.inner === undefined || item.type !== 'group') {
		return { ...filter, items: filter.items.filter((_, i) => i !== address.index) };
	}
	const items = item.items.filter((_, i) => i !== address.inner);
	return items.length === 0
		? { ...filter, items: filter.items.filter((_, i) => i !== address.index) }
		: {
				...filter,
				items: replaceAt({ list: filter.items, index: address.index, item: { ...item, items } })
			};
}

/** The filter with the connective of the top level, or of the group at `index`, set. */
export function setConnective({
	filter,
	index,
	op
}: {
	filter: FilterRoot;
	index?: number;
	op: Connective;
}): FilterRoot {
	if (index === undefined) return { ...filter, op };
	const group = filter.items[index];
	if (group?.type !== 'group') return filter;
	return { ...filter, items: replaceAt({ list: filter.items, index, item: { ...group, op } }) };
}

/** The filter with a condition on `column` added at the top, as a header's filter button does. */
export function addConditionFor({
	filter,
	column
}: {
	filter: FilterRoot;
	column: ColumnMeta;
}): FilterRoot {
	return addItem({ filter, item: newCondition(column) });
}
