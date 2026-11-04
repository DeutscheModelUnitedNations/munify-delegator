import type { GroupPath, TableState } from '#lib/dataGrid/stateSchema';
import { dataQueryOf } from '#lib/dataGrid/stateSchema';
import { addConditionFor } from '#lib/dataGrid/filterEdit';
import { isGroupOpen, toggleGroup } from '#lib/dataGrid/grouping';
import { moveColumn, stateKey, visibleColumnIds } from '#lib/dataGrid/tableState';
import type { ResolvedGrid } from '#lib/dataGrid/urlState';
import type { SavedView } from '#lib/dataGrid/views';
import type { GridColumn } from './gridColumn';

/**
 * A grid's memory: the state of its view (filter, sorting, grouping, columns, page size), the view
 * it came from, the search, the page and the selected rows. Pure state and the edits on it - the
 * components render and fetch, `gridUrl.svelte.ts` mirrors it into the URL through `onChange`.
 *
 * Every edit that changes which rows show, or in which order, goes back to page 1, right in the
 * edit, so there is never a moment with a page past the end.
 */

/** The parts of a state, each written on its own (`edit`). */
const TABLE_STATE_KEYS = [
	'v',
	'visibility',
	'order',
	'sizes',
	'sorting',
	'filter',
	'grouping',
	'groups',
	'pageSize'
] as const satisfies readonly (keyof TableState)[];

/** The parts of the state the queries ask with (`applied`). */
const APPLIED_KEYS = [
	'filter',
	'sorting',
	'grouping'
] as const satisfies readonly (keyof TableState)[];

type AppliedPart = Pick<TableState, (typeof APPLIED_KEYS)[number]>;

function appliedPart(state: TableState): AppliedPart {
	return { filter: state.filter, sorting: state.sorting, grouping: state.grouping };
}

function assignApplied<K extends keyof AppliedPart>({
	target,
	next,
	key
}: {
	target: AppliedPart;
	next: AppliedPart;
	key: K;
}) {
	target[key] = next[key];
}

/** How long typing pauses before the search is asked for. */
const SEARCH_SETTLE_MS = 250;

/**
 * The sorting after a click on a column's header: ascending, then descending, then not at all.
 * With `multi` (shift) the column joins the sorting rather than replacing it.
 */
export function nextSorting({
	sorting,
	id,
	multi
}: {
	sorting: TableState['sorting'];
	id: string;
	multi: boolean;
}): TableState['sorting'] {
	const entry = sorting.find((sorted) => sorted.id === id);
	const next = !entry ? { id, desc: false } : !entry.desc ? { id, desc: true } : undefined;
	if (!multi) return next ? [next] : [];
	if (!entry) return next ? [...sorting, next].slice(-5) : sorting;
	return next
		? sorting.map((sorted) => (sorted.id === id ? next : sorted))
		: sorting.filter((sorted) => sorted.id !== id);
}

export function createGridState<Row>({
	columns,
	initial,
	views,
	rowId,
	onChange
}: {
	/** The columns (a getter: a page may learn an enum's options later) */
	columns: () => readonly GridColumn<Row>[];
	initial: ResolvedGrid;
	/** The saved views there are (live): the chosen one is looked up by id, so a rename shows */
	views: () => readonly SavedView[];
	rowId: (row: Row) => string;
	/** Called after every edit, for the URL */
	onChange?: () => void;
}) {
	let state = $state<TableState>(initial.state);
	/**
	 * What the queries ask with: the state's filter, sorting and grouping, a task behind it. An edit
	 * commits in a batch of its own (the panel shows it at once) and the fetch it causes in the
	 * next; otherwise Svelte holds the panel's update back until the table's rows have arrived.
	 */
	const applied = $state(appliedPart(initial.state));
	let applying: ReturnType<typeof setTimeout> | undefined;
	let saved = $state<TableState>(initial.saved);
	let viewId = $state<string | null>(initial.view?.id ?? null);
	/** The chosen view; `null` for the base view, or once someone deleted the chosen one */
	const view = $derived(viewId === null ? null : (views().find((v) => v.id === viewId) ?? null));
	let typedSearch = $state(initial.search);
	let search = $state(initial.search.trim());
	let pageIndex = $state(initial.page - 1);
	/** The selected rows by id, kept whole so the export needs no second request */
	let selection = $state.raw<Readonly<Record<string, Row>>>({});
	let settle: ReturnType<typeof setTimeout> | undefined;

	const byId = $derived(Object.fromEntries(columns().map((column) => [column.id, column])));
	const columnById = (id: string) => (Object.hasOwn(byId, id) ? byId[id] : undefined);
	const pinned = $derived(
		columns()
			.filter((column) => column.alwaysVisible)
			.map((column) => column.id)
	);

	const visibleIds = $derived(visibleColumnIds({ columns: columns(), state }));
	const visibleColumns = $derived(
		visibleIds.flatMap((id) => {
			const column = columnById(id);
			return column ? [column] : [];
		})
	);
	const dirty = $derived(
		stateKey({ state, columns: columns() }) !== stateKey({ state: saved, columns: columns() })
	);

	/**
	 * Applies an edit to the state, part by part: only the parts that changed are written, so a
	 * query reading the filter does not run again when a group is opened. `resetPage` for edits
	 * that change which rows show.
	 */
	function edit(change: (current: TableState) => TableState, resetPage = false) {
		const next = change($state.snapshot(state));
		const write = <K extends keyof TableState>(key: K) => {
			if (JSON.stringify(next[key]) !== JSON.stringify($state.snapshot(state[key])))
				state[key] = next[key];
		};
		for (const key of TABLE_STATE_KEYS) write(key);
		if (resetPage) pageIndex = 0;
		apply();
		onChange?.();
	}

	/** Hands the state's filter, sorting and grouping to the queries, on the next task. */
	function apply() {
		clearTimeout(applying);
		applying = setTimeout(() => {
			const next = appliedPart($state.snapshot(state));
			for (const key of APPLIED_KEYS) {
				if (JSON.stringify(next[key]) !== JSON.stringify($state.snapshot(applied[key])))
					assignApplied({ target: applied, next, key });
			}
		});
	}

	const clone = (value: TableState) => structuredClone($state.snapshot(value));

	return {
		get state() {
			return state;
		},
		get saved() {
			return saved;
		},
		/** The filter, sorting and grouping the rows on screen were asked with (`query`) */
		get applied(): Readonly<AppliedPart> {
			return applied;
		},
		get view() {
			return view;
		},
		get dirty() {
			return dirty;
		},
		get typedSearch() {
			return typedSearch;
		},
		/** The search to ask with: the box, once typing has paused */
		get search() {
			return search;
		},
		get pageIndex() {
			return pageIndex;
		},
		get visibleColumns() {
			return visibleColumns;
		},
		/** Every column, for the menus */
		get columns() {
			return columns();
		},
		get pinned() {
			return pinned;
		},
		column(id: string) {
			return columnById(id);
		},
		/** The query for the rows of a group (the whole table at the top level) */
		query(path: GroupPath = []) {
			return dataQueryOf({ state: applied, path });
		},

		setSearch(value: string) {
			typedSearch = value;
			clearTimeout(settle);
			settle = setTimeout(() => {
				search = value.trim();
				pageIndex = 0;
				onChange?.();
			}, SEARCH_SETTLE_MS);
		},
		setFilter(filter: TableState['filter']) {
			edit((current) => ({ ...current, filter }), true);
		},
		/** Adds a condition on a column, as a header's filter button does */
		filterBy(column: GridColumn<Row>) {
			edit(
				(current) => ({ ...current, filter: addConditionFor({ filter: current.filter, column }) }),
				true
			);
		},
		/**
		 * Sorts by a column: ascending, then descending, then not at all. With `multi` (shift) the
		 * column joins the sorting rather than replacing it.
		 */
		toggleSort({ id, multi }: { id: string; multi: boolean }) {
			edit(
				(current) => ({
					...current,
					sorting: nextSorting({ sorting: current.sorting, id, multi })
				}),
				true
			);
		},
		setSorting(sorting: TableState['sorting']) {
			edit((current) => ({ ...current, sorting }), true);
		},
		setGrouping(grouping: TableState['grouping']) {
			edit(
				(current) => ({ ...current, grouping, groups: { collapsed: false, toggled: [] } }),
				true
			);
		},
		isGroupOpen(path: GroupPath) {
			return isGroupOpen({ path, display: state.groups });
		},
		toggleGroup(path: GroupPath) {
			edit((current) => ({ ...current, groups: toggleGroup({ path, display: current.groups }) }));
		},
		expandAll() {
			edit((current) => ({ ...current, groups: { collapsed: false, toggled: [] } }));
		},
		collapseAll() {
			edit((current) => ({ ...current, groups: { collapsed: true, toggled: [] } }));
		},
		setVisible({ id, visible }: { id: string; visible: boolean }) {
			edit((current) => ({ ...current, visibility: { ...current.visibility, [id]: visible } }));
		},
		moveColumn({ id, delta }: { id: string; delta: -1 | 1 }) {
			edit((current) => ({
				...current,
				order: moveColumn({
					ids: visibleColumnIds({ columns: columns(), state: current }),
					id,
					delta,
					locked: pinned
				})
			}));
		},
		resize({ id, width }: { id: string; width: number }) {
			const size = Math.round(Math.min(1200, Math.max(40, width)));
			edit((current) => ({ ...current, sizes: { ...current.sizes, [id]: size } }));
		},
		resetSizes() {
			edit((current) => ({ ...current, sizes: {} }));
		},
		setPageSize(pageSize: number) {
			edit((current) => ({ ...current, pageSize }), true);
		},
		setPage(index: number) {
			pageIndex = Math.max(0, index);
			onChange?.();
		},

		/** The key a row is known by in the table, for keyed lists */
		rowKey(row: Row) {
			return rowId(row);
		},
		get selectedCount() {
			return Object.keys(selection).length;
		},
		get selectedRows() {
			return Object.values(selection);
		},
		isSelected(row: Row) {
			return Object.hasOwn(selection, rowId(row));
		},
		setSelected({ rows, selected }: { rows: readonly Row[]; selected: boolean }) {
			const ids = rows.map(rowId);
			const kept = Object.entries(selection).filter(([id]) => !ids.includes(id));
			selection = Object.fromEntries(
				selected ? [...kept, ...rows.map((row) => [rowId(row), row] as const)] : kept
			);
		},
		clearSelection() {
			selection = {};
		},

		/** Switches to a view (`null`: the base view); changes to the old one are dropped */
		selectView({ next, base }: { next: SavedView | null; base: TableState }) {
			viewId = next?.id ?? null;
			saved = structuredClone(next?.state ?? base);
			state = structuredClone(next?.state ?? base);
			pageIndex = 0;
			apply();
			onChange?.();
		},
		/** After saving: what shows now is the saved state of the view `id` */
		markSaved(id: string) {
			viewId = id;
			saved = clone(state);
			onChange?.();
		},
		discard() {
			state = clone(saved);
			pageIndex = 0;
			apply();
			onChange?.();
		},
		/** The state without Svelte's proxy, to save */
		snapshot(): TableState {
			return clone(state);
		}
	};
}

export type GridState<Row> = ReturnType<typeof createGridState<Row>>;
