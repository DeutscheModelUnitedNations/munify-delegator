import Fuse from 'fuse.js';
import type { ColumnDef, RowData, TableFeatures } from '@tanstack/svelte-table';

/**
 * The text a row is searched by: the string values of its columns in column order, so what a
 * table shows first (the name) is what an early match is closest to.
 */
export function rowSearchText<TFeatures extends TableFeatures, TData extends RowData>(
	columns: readonly ColumnDef<TFeatures, TData>[],
	row: TData,
	index: number
): string {
	let text = '';
	for (const column of columns) {
		let value: unknown;
		if ('accessorFn' in column && column.accessorFn) {
			value = column.accessorFn(row, index);
		} else if ('accessorKey' in column && typeof column.accessorKey === 'string') {
			value = Reflect.get(Object(row), column.accessorKey);
		}
		if (typeof value === 'string') text += ` ${value}`;
	}
	return text;
}

/**
 * The fuzzy search every table has always used: Fuse over each row's text with a threshold of
 * 0.4, every whitespace separated term of the search having to match. Results come best match
 * first, and a match near the start of the text (the name) ranks highest. Returns a function from
 * a search to the matching rows; an empty search gives every row in its own order.
 */
export function createFuzzySearch<T>(
	rows: readonly T[],
	textOf: (row: T, index: number) => string
): (search: string) => readonly T[] {
	const fuse = new Fuse(
		rows.map((row, index) => ({ row, text: textOf(row, index) })),
		{
			keys: ['text'],
			shouldSort: true,
			threshold: 0.4,
			minMatchCharLength: 1,
			useExtendedSearch: true
		}
	);
	return (search) => {
		const terms = search.split(' ').filter((term) => term.trim());
		if (terms.length === 0) return rows;
		return fuse.search({ $and: terms.map((term) => ({ text: term })) }).map((hit) => hit.item.row);
	};
}
