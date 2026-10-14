import {
	columnHeaderOf,
	columnIdOf,
	type ColumnFilter,
	type ManagedColumn
} from '$lib/components/tanStackTable/managedTable';

/** What the drawers need to know of a table column. */
interface DrawerColumn {
	id: string;
	getCanFilter(): boolean;
	getIsVisible(): boolean;
}

/** Whatever can look up a column by id, which a table does. */
interface ColumnLookup<C> {
	getColumn(id: string): C | undefined;
}

/** A column is offered while it is shown, or always when its filter says so. */
function isOffered(col: DrawerColumn, filter: ColumnFilter): boolean {
	return col.getCanFilter() && (col.getIsVisible() || Boolean(filter.alwaysAvailable));
}

/** The columns the filter drawer lists, with the filter, group and heading each is listed with. */
export function filterEntries<TData extends object, C extends DrawerColumn>(
	columns: ManagedColumn<TData>[],
	table: ColumnLookup<C>
) {
	return columns.flatMap((def) => {
		const col = table.getColumn(columnIdOf(def) ?? '');
		const filter = def.filter;
		if (!col || !filter || !isOffered(col, filter)) return [];
		return [{ col, filter, group: def.group, header: columnHeaderOf(def) || col.id }];
	});
}

function rank(heading: string, groupOrder: string[]): number {
	const index = groupOrder.indexOf(heading);
	return index === -1 ? groupOrder.length : index;
}

/** Entries without a group come first, then the headings in `groupOrder`, then the rest. */
function compareGroups(a: string | undefined, b: string | undefined, groupOrder: string[]): number {
	if (a === undefined) return b === undefined ? 0 : -1;
	if (b === undefined) return 1;
	return rank(a, groupOrder) - rank(b, groupOrder);
}

/** Entries by group heading, in the order the groups are listed in. */
export function groupEntries<E extends { group?: string }>(
	entries: E[],
	groupOrder: string[] = []
): [string | undefined, E[]][] {
	const grouped = Map.groupBy(entries, (entry) => entry.group);
	return [...grouped.entries()].sort(([a], [b]) => compareGroups(a, b, groupOrder));
}
