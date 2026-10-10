import type { SortingState } from '@tanstack/svelte-table';
import type { TableState } from './tableState.svelte';
import type { TextFilterValue } from './filters';

/** Escapes the characters `like` gives a meaning to, so a search word is matched literally. */
const escapeLike = (word: string) => word.replace(/[\\%_]/g, '\\$&');

/** The words of a search, at most `max` of them; each is meant to be contained somewhere. */
export function searchWords(search: string, max = 5): string[] {
	return search.split(/\s+/).filter(Boolean).slice(0, max);
}

/** `%word%` for an `ilike` filter. */
export const containing = (word: string) => ({ ilike: `%${escapeLike(word)}%` });

/**
 * The arguments that make a list query return one page: one row more than the table shows, which
 * is how the table knows whether another page follows (see `pageOf`).
 */
export function pageArgs(state: TableState) {
	const { pageIndex, pageSize } = state.pagination;
	return { limit: pageSize + 1, offset: pageIndex * pageSize };
}

/** The rows of the page, and whether the extra row `pageArgs` asked for came back. */
export function pageOf<T>(rows: readonly T[], state: TableState): { rows: T[]; hasMore: boolean } {
	const { pageSize } = state.pagination;
	return { rows: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export type SortDirection = 'asc' | 'desc';

/**
 * The `orderBy` for a sorting: the sorted columns the backend can order by, in order, each
 * through `order(direction)`, merged into the one object rumble takes. Columns it cannot order by
 * are left out; such a column should set `enableSorting: false`. `fallback` orders whatever the
 * sorting does not decide, so that paging through ties stays stable.
 */
export function orderFrom<Order extends object>(
	sorting: SortingState,
	orders: Record<string, (direction: SortDirection) => Order>,
	fallback: Order
): Order {
	const chosen = sorting.flatMap(({ id, desc }) => {
		const order = orders[id];
		return order ? [order(desc ? 'desc' : 'asc')] : [];
	});
	return Object.assign({}, ...chosen, fallback);
}

/** A word somewhere in a person's name or email, as a filter on the user table. */
export function personContains(word: string) {
	const like = containing(word);
	return { OR: [{ givenName: like }, { familyName: like }, { email: like }] };
}

function isTextFilter(value: unknown): value is TextFilterValue {
	return (
		typeof value === 'object' &&
		value !== null &&
		'mode' in value &&
		typeof value.mode === 'string' &&
		'value' in value &&
		typeof value.value === 'string'
	);
}

/** A string column's text filter from the filter drawer, as a rumble string filter. */
export function stringFilter(filter: unknown):
	| {
			ilike?: string;
			notIlike?: string;
			eq?: string;
			ne?: string;
			isNull?: boolean;
			isNotNull?: boolean;
	  }
	| undefined {
	if (!isTextFilter(filter)) return undefined;
	const { mode, value } = filter;
	if (mode === 'isEmpty') return { isNull: true };
	if (mode === 'isNotEmpty') return { isNotNull: true };
	if (!value) return undefined;
	const like = escapeLike(value);
	switch (mode) {
		case 'equals':
			return { eq: value };
		case 'equalsNot':
			return { ne: value };
		case 'startsWith':
			return { ilike: `${like}%` };
		case 'startsWithNot':
			return { notIlike: `${like}%` };
		case 'containsNot':
			return { notIlike: `%${like}%` };
		default:
			return { ilike: `%${like}%` };
	}
}

/** A boolean column's filter (`true`, `false`; anything else is no filter). */
export function booleanFilter(filter: unknown): boolean | undefined {
	return typeof filter === 'boolean' ? filter : undefined;
}

/** The selected values of an enum filter (`—` stands for an empty value and is not a value). */
export function enumFilter(filter: unknown): string[] {
	return Array.isArray(filter)
		? filter.filter((value): value is string => typeof value === 'string')
		: [];
}

/** The bounds of a range filter. */
export function rangeFilter(filter: unknown): { gte?: number; lte?: number } | undefined {
	if (!Array.isArray(filter) || filter.length !== 2) return undefined;
	const [min, max] = filter;
	const range = {
		...(typeof min === 'number' ? { gte: min } : {}),
		...(typeof max === 'number' ? { lte: max } : {})
	};
	return Object.keys(range).length > 0 ? range : undefined;
}

/** The most rows the backend returns for one request (`defaultLimit` in `$api/rumble`). */
export const BACKEND_PAGE_LIMIT = 1000;

/** Every row a paged query has, fetched one backend page after the other (for exports). */
export async function fetchEveryRow<T>(
	fetchPage: (paging: { limit: number; offset: number }) => Promise<readonly T[]>
): Promise<T[]> {
	const all: T[] = [];
	for (let offset = 0; ; offset += BACKEND_PAGE_LIMIT) {
		const rows = await fetchPage({ limit: BACKEND_PAGE_LIMIT, offset });
		all.push(...rows);
		if (rows.length < BACKEND_PAGE_LIMIT) return all;
	}
}

/**
 * A count the backend answered. The generated client types every top-level scalar as a
 * subscribeable but resolves it to the plain number, so this only tells the compiler so.
 */
export const asCount = (count: unknown): number => Number(count);

/**
 * `{ AND: conditions }`, or nothing for an empty list: rumble rejects an empty `AND`, and a search
 * with no words or a table without filters has no conditions.
 */
export const allOf = <T>(conditions: T[]): { AND?: T[] } =>
	conditions.length > 0 ? { AND: conditions } : {};
