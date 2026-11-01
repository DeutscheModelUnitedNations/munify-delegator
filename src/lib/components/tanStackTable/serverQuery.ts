import type { SortingState } from '@tanstack/svelte-table';
import type { TableState } from './tableState.svelte';
import { enumFilterInput, rangeFilterInput, textFilterInput } from './filters';
import { z } from 'zod';

/** Escapes the characters `like` gives a meaning to, so a search text is matched literally. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

/** `%text%` for an `ilike` filter. */
export const containing = (text: string) => ({ ilike: `%${escapeLike(text)}%` });

/**
 * The arguments that make a list query return one page: one row more than the table shows, which
 * is how the table knows whether another page follows (see `pageOf`).
 */
export function pageArgs(state: TableState) {
	const { pageIndex, pageSize } = state.pagination;
	return { limit: pageSize + 1, offset: pageIndex * pageSize };
}

/** The rows of the page, and whether the extra row `pageArgs` asked for came back. */
export function pageOf<T>({ rows, state }: { rows: readonly T[]; state: TableState }): {
	rows: T[];
	hasMore: boolean;
} {
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
export function orderFrom<Order extends object>({
	sorting,
	orders,
	fallback
}: {
	sorting: SortingState;
	orders: Record<string, (direction: SortDirection) => Order>;
	fallback: Order;
}): Order {
	const chosen = sorting.flatMap(({ id, desc }) => {
		const order = orders[id];
		return order ? [order(desc ? 'desc' : 'asc')] : [];
	});
	return Object.assign({}, ...chosen, fallback);
}

type StringFilter = {
	ilike?: string;
	notIlike?: string;
	eq?: string;
	ne?: string;
	isNull?: boolean;
	isNotNull?: boolean;
};

/** How each text filter mode of the drawer maps to a rumble string filter; `contains` is the fallback. */
const stringFilterModes: Record<string, (value: string, like: string) => StringFilter> = {
	equals: (value) => ({ eq: value }),
	equalsNot: (value) => ({ ne: value }),
	startsWith: (_, like) => ({ ilike: `${like}%` }),
	startsWithNot: (_, like) => ({ notIlike: `${like}%` }),
	containsNot: (_, like) => ({ notIlike: `%${like}%` })
};

/** A string column's text filter from the filter drawer, as a rumble string filter. */
export function stringFilter(filter: unknown): StringFilter | undefined {
	const parsed = textFilterInput.safeParse(filter);
	if (!parsed.success) return undefined;
	const { mode, value } = parsed.data;
	if (mode === 'isEmpty') return { isNull: true };
	if (mode === 'isNotEmpty') return { isNotNull: true };
	if (!value) return undefined;
	const like = escapeLike(value);
	return (stringFilterModes[mode] ?? ((_, l) => ({ ilike: `%${l}%` })))(value, like);
}

/** A boolean column's filter (`true`, `false`; anything else is no filter). */
export function booleanFilter(filter: unknown): boolean | undefined {
	const parsed = z.boolean().safeParse(filter);
	return parsed.success ? parsed.data : undefined;
}

/** The selected values of an enum filter (`—` stands for an empty value and is not a value). */
export function enumFilter(filter: unknown): string[] {
	const parsed = enumFilterInput.safeParse(filter);
	return parsed.success ? parsed.data : [];
}

/** The bounds of a range filter. */
export function rangeFilter(filter: unknown): { gte?: number; lte?: number } | undefined {
	const parsed = rangeFilterInput.safeParse(filter);
	if (!parsed.success) return undefined;
	const { min, max } = parsed.data;
	const range = {
		...(min !== undefined ? { gte: min } : {}),
		...(max !== undefined ? { lte: max } : {})
	};
	return Object.keys(range).length > 0 ? range : undefined;
}

/** The most rows the backend returns for one request (`defaultLimit` in `#api/rumble`). */
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
 * with nothing to match or a table without filters has no conditions.
 */
export const allOf = <T>(conditions: T[]): { AND?: T[] } =>
	conditions.length > 0 ? { AND: conditions } : {};
