/**
 * The role popularity table's narrowing and sorting. The server sends the rows grouped by seats and,
 * within a group, least popular first; that order is the table's default. A column sort orders
 * across all seat counts.
 */

export interface PopularityRow {
	roleId: string;
	seats: number;
	applications: number;
	firstChoice: number;
	secondChoice: number;
	thirdChoice: number;
	laterChoice: number;
	weightedPopularity: number;
}

export type PopularitySortKey =
	| 'name'
	| 'seats'
	| 'applications'
	| 'firstChoice'
	| 'secondChoice'
	| 'thirdChoice'
	| 'laterChoice'
	| 'weightedPopularity';

export interface PopularitySort {
	key: PopularitySortKey;
	descending: boolean;
}

/** The seat counts the rows have, smallest first: the options of the seat filter. */
export function seatCountsOf(rows: readonly { seats: number }[]) {
	return [...new Set(rows.map((row) => row.seats))].toSorted((a, b) => a - b);
}

/**
 * The rows with `seats` (all for undefined), ordered by `sort` (the default order for undefined).
 * Ties keep the default order, so a column sort stays grouped by seats within equal values.
 */
export function popularityRowsOf<R extends PopularityRow>({
	rows,
	seats,
	sort,
	nameOf
}: {
	rows: readonly R[];
	seats: number | undefined;
	sort: PopularitySort | undefined;
	nameOf: (row: R) => string;
}): R[] {
	const narrowed = rows.filter((row) => seats === undefined || row.seats === seats);
	if (!sort) return narrowed;
	const direction = sort.descending ? -1 : 1;
	return narrowed.toSorted((a, b) => {
		const order =
			sort.key === 'name' ? nameOf(a).localeCompare(nameOf(b)) : a[sort.key] - b[sort.key];
		return direction * order;
	});
}

/**
 * The next sort after a click on `key`'s header: a new column sorts ascending (names A–Z, the least
 * first), a second click descending, a third returns to the default order.
 */
export function nextPopularitySort({
	current,
	key
}: {
	current: PopularitySort | undefined;
	key: PopularitySortKey;
}): PopularitySort | undefined {
	if (current?.key !== key) return { key, descending: false };
	if (!current.descending) return { key, descending: true };
	return undefined;
}
