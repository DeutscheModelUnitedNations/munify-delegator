import { regionalGroups, type RegionalGroup } from './unMembers';

/**
 * Sorting of the states matrix. `key` is `name`, `group`, `size` or the id of a committee (sorts
 * by whether the state holds a seat there). Ties are always broken by the name, ascending.
 */

export interface SortableRow {
	name: string;
	alpha3Code: string;
	regionalGroup: RegionalGroup;
}

export interface SeatLookup {
	size: (alpha3Code: string) => number;
	hasSeat: (committeeId: string, alpha3Code: string) => boolean;
}

/** Text columns start A-Z, number and seat columns start with the most seats */
export const defaultDescending = (key: string) => key !== 'name' && key !== 'group';

function sortValue(row: SortableRow, key: string, seats: SeatLookup): number {
	if (key === 'group') return regionalGroups.indexOf(row.regionalGroup);
	if (key === 'size') return seats.size(row.alpha3Code);
	return seats.hasSeat(key, row.alpha3Code) ? 1 : 0;
}

export function sortSeatRows<T extends SortableRow>(
	rows: T[],
	sort: { key: string; descending: boolean },
	seats: SeatLookup
): T[] {
	const direction = sort.descending ? -1 : 1;
	const byName = (a: T, b: T) => a.name.localeCompare(b.name);

	if (sort.key === 'name') return [...rows].sort((a, b) => direction * byName(a, b));

	return [...rows].sort(
		(a, b) =>
			direction * (sortValue(a, sort.key, seats) - sortValue(b, sort.key, seats)) || byName(a, b)
	);
}

/**
 * URL parameters after a click on a column header: the active column flips its direction, any
 * other column starts with its default. Defaults (sorted by name, ascending) are `null`, which
 * keeps them out of the URL.
 */
export function nextSortParams(
	current: { sort: string | null; desc: boolean | null },
	clicked: string
) {
	const active = current.sort ?? 'name';
	const descending = active === clicked ? !current.desc : defaultDescending(clicked);
	return { sort: clicked === 'name' ? null : clicked, desc: descending || null };
}
