import { emptyFilter, type TableState } from './stateSchema';

/**
 * The pure parts of a grid's state: the table's base view, which columns show in which order, and
 * whether two states show the same thing ("view changed").
 */

/** What these functions need of a column. */
export interface StateColumn {
	id: string;
	/** Shown in the base view */
	defaultVisible?: boolean;
	/** Always shown, and pinned to the left (the column a row is known by) */
	alwaysVisible?: boolean;
}

/** What a table's base view starts from, where the page does not say otherwise. */
export interface BaseView {
	sorting?: TableState['sorting'];
	filter?: TableState['filter'];
	grouping?: TableState['grouping'];
	pageSize?: number;
}

/** The table's built-in view: its columns' defaults and the page's base sorting and filter. */
export function baseState(base: BaseView = {}): TableState {
	return {
		v: 1,
		visibility: {},
		order: [],
		sizes: {},
		sorting: structuredClone(base.sorting ?? []),
		filter: structuredClone(base.filter ?? emptyFilter()),
		grouping: structuredClone(base.grouping ?? []),
		groups: { collapsed: false, toggled: [] },
		pageSize: base.pageSize ?? 50
	};
}

/** Whether the column shows in the state; without an entry, its default applies. */
function isVisible({
	column,
	state
}: {
	column: StateColumn;
	state: Pick<TableState, 'visibility'>;
}) {
	if (column.alwaysVisible) return true;
	return state.visibility[column.id] ?? column.defaultVisible !== false;
}

/** The columns in order: the stored order first, then every other one in definition order. */
export function effectiveOrder({
	columns,
	order
}: {
	columns: readonly StateColumn[];
	order: readonly string[];
}) {
	const known = new Set(columns.map((column) => column.id));
	const listed = order.filter((id) => known.has(id));
	const seen = new Set(listed);
	const pinned = columns.filter((column) => column.alwaysVisible).map((column) => column.id);
	const rest = [...listed, ...columns.map((column) => column.id).filter((id) => !seen.has(id))];
	// pinned columns always lead, in definition order
	return [...pinned, ...rest.filter((id) => !pinned.includes(id))];
}

/** The ids of the columns that show, in order. */
export function visibleColumnIds({
	columns,
	state
}: {
	columns: readonly StateColumn[];
	state: Pick<TableState, 'visibility' | 'order'>;
}) {
	const byId = new Map(columns.map((column) => [column.id, column]));
	return effectiveOrder({ columns, order: state.order }).filter((id) => {
		const column = byId.get(id);
		return column !== undefined && isVisible({ column, state });
	});
}

/**
 * Moves a column one place among `ids`. Pinned columns (`locked`) stay in front: nothing moves
 * before them and they do not move.
 */
export function moveColumn({
	ids,
	id,
	delta,
	locked
}: {
	ids: readonly string[];
	id: string;
	delta: -1 | 1;
	locked: readonly string[];
}) {
	const next = [...ids];
	const index = next.indexOf(id);
	const target = index + delta;
	const blocked =
		index === -1 ||
		target < 0 ||
		target >= next.length ||
		locked.includes(next[target]) ||
		locked.includes(id);
	if (blocked) return next;
	[next[index], next[target]] = [next[target], next[index]];
	return next;
}

/**
 * A key for what a state shows. Two states with the same key look the same to the viewer, even if
 * one hides a column explicitly that the other hides by default. "View changed" compares these.
 */
export function stateKey({
	state,
	columns
}: {
	state: TableState;
	columns: readonly StateColumn[];
}) {
	const known = new Set(columns.map((column) => column.id));
	return JSON.stringify({
		visible: visibleColumnIds({ columns, state }),
		sizes: Object.entries(state.sizes)
			.filter(([id]) => known.has(id))
			.sort(([a], [b]) => a.localeCompare(b)),
		sorting: state.sorting,
		filter: state.filter,
		grouping: state.grouping,
		groups: { collapsed: state.groups.collapsed, toggled: [...state.groups.toggled].sort() },
		pageSize: state.pageSize
	});
}
