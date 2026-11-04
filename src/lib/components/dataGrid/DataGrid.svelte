<script lang="ts" generics="Row">
	import { untrack, type Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { baseState, type BaseView } from '#lib/dataGrid/tableState';
	import { gridParams, resolveGrid } from '#lib/dataGrid/urlState';
	import { initialView, type SavedView } from '#lib/dataGrid/views';
	import type { GridSource } from './dataSource';
	import { tableExport } from './exportRows';
	import FilterPanel from './filter/FilterPanel.svelte';
	import ColumnPanel from './columns/ColumnPanel.svelte';
	import FlatGrid from './FlatGrid.svelte';
	import type { GridColumn } from './gridColumn';
	import { createGridState, type GridState } from './gridState.svelte';
	import { createGridUrl } from './gridUrl.svelte';
	import GroupByPanel from './grouping/GroupByPanel.svelte';
	import GroupedGrid from './GroupedGrid.svelte';
	import { gridLayout } from './table/layout';
	import GridToolbar from './toolbar/GridToolbar.svelte';
	import PrintHeader from './toolbar/PrintHeader.svelte';
	import SelectionBar from './toolbar/SelectionBar.svelte';
	import GridViews from './views/GridViews.svelte';
	import { fetchViewContext } from './views/viewContext';
	import { fetchSavedViews, type ViewsTarget } from './views/viewsApi';

	/**
	 * The data table of the team's pages, after the member table of the Mitgliedshub: a free-text
	 * search, a filter builder (conditions and groups, AND / OR), sorting by several columns, grouping
	 * by up to three columns with collapsible groups, columns to show, move and resize, pages,
	 * selection and export - and, for a table with `views`, saved views, personal or shared.
	 *
	 * The page says what its rows are (`columns`) and where they come from (`source`: the API's table
	 * engine for the big tables, `createLocalSource` for rows it already holds); the grid does the
	 * rest. Its state lives in the URL, so a copied link shows the same table.
	 *
	 * This component only composes: the state is `gridState.svelte.ts`, the URL `gridUrl.svelte.ts`,
	 * the rows are fetched by `FlatGrid` / `GroupLevel` / `GroupRows` for exactly what they show.
	 */
	interface Props {
		columns: readonly GridColumn<Row>[];
		source: GridSource<Row>;
		rowId: (row: Row) => string;
		/** What the table shows before anyone changed anything, and where no view says otherwise */
		base?: BaseView;
		/** The table and conference to keep saved views for; no views without */
		views?: ViewsTarget;
		/** Names the table for screen readers and heads the printout */
		label: string;
		/** The export's file name */
		exportName: string;
		emptyText?: string;
		onRowClick?: (row: Row) => void;
		isRowHighlighted?: (row: Row) => boolean;
		/** Rows can be selected, and the export takes the selection */
		selectable?: boolean;
		/** Buttons at the end of each row, in a column pinned to the right */
		actions?: Snippet<[Row]>;
		actionsWidth?: number;
		/** The page's own controls in the toolbar; they get the grid's state */
		toolbar?: Snippet<[GridState<Row>]>;
		/** Before the URL parameters, for a page holding more than one grid */
		urlPrefix?: string;
		/**
		 * A link carrying a search (`?q=`) that finds exactly one row opens it (`onRowClick`), as
		 * links to a person from elsewhere do.
		 */
		openSoleMatch?: boolean;
	}

	let {
		columns,
		source,
		rowId,
		base: baseView,
		views: viewsTarget,
		label,
		exportName,
		emptyText,
		onRowClick,
		isRowHighlighted,
		selectable = false,
		actions,
		actionsWidth = actions ? 96 : 0,
		toolbar,
		urlPrefix,
		openSoleMatch = false
	}: Props = $props();

	// Before the first await: afterwards a server render has no request to read the URL of.
	const url = createGridUrl({ prefix: untrack(() => urlPrefix) });
	const base = baseState(untrack(() => baseView));
	const target = untrack(() => viewsTarget);
	const soleMatch = untrack(() =>
		openSoleMatch && onRowClick && url.opened.get('q') ? onRowClick : undefined
	);

	const context = target ? await fetchViewContext(target.conferenceId) : undefined;
	const readViews = $derived(
		target && context ? await fetchSavedViews({ target, userId: context.userId }) : () => []
	);
	// read here, not in the fetch, so a view someone saves or renames shows up
	const savedViews = $derived<SavedView[]>(readViews());
	const opening = $derived(initialView(savedViews));
	const readChanges = $derived(source.changes ? await source.changes() : () => '');
	// read here, not in the fetch, so a row someone adds or removes elsewhere shows up
	const revision = $derived(readChanges());

	const grid: GridState<Row> = createGridState({
		columns: () => columns,
		initial: resolveGrid({
			params: url.opened,
			views: untrack(() => savedViews),
			opening: untrack(() => opening),
			base
		}),
		views: () => savedViews,
		rowId: (row) => rowId(row),
		revision: () => revision,
		onChange: () =>
			url.write(
				gridParams({
					view: grid.view,
					opening,
					state: grid.state,
					saved: grid.saved,
					search: grid.search,
					page: grid.pageIndex + 1,
					columns
				})
			)
	});

	let filterOpen = $state(false);
	let groupOpen = $state(false);
	let columnsOpen = $state(false);

	function openPanel(panel: 'filter' | 'group' | 'columns') {
		filterOpen = panel === 'filter';
		groupOpen = panel === 'group';
		columnsOpen = panel === 'columns';
	}

	const layout = $derived(
		gridLayout({ columns: grid.visibleColumns, sizes: grid.state.sizes, selectable, actionsWidth })
	);
	const colspan = $derived(layout.cells.length + (selectable ? 1 : 0) + (actionsWidth > 0 ? 1 : 0));
	const rowProps = $derived({
		layout,
		colspan,
		selectable,
		onRowClick,
		isRowHighlighted,
		actions,
		actionsWidth
	});

	/** The selection when there is one, else every row matching the search and the filter. */
	async function getExport() {
		const rows =
			grid.selectedCount > 0
				? grid.selectedRows
				: await source.all({ query: grid.query(), search: grid.search, revision: grid.revision });
		return tableExport({ columns: grid.visibleColumns, rows });
	}
</script>

<div class="flex min-w-0 flex-col gap-3">
	<GridToolbar {grid} {exportName} {getExport} onpanel={openPanel}>
		{#snippet extra()}
			{@render toolbar?.(grid)}
		{/snippet}
		{#snippet views()}
			{#if target && context}
				<GridViews {grid} {target} views={savedViews} rights={context.rights} {base} />
			{/if}
		{/snippet}
	</GridToolbar>

	{#if grid.selectedCount > 0}
		<SelectionBar count={grid.selectedCount} onclear={() => grid.clearSelection()}>
			<span class="text-base-content/70">{m.dataGridSelectionExportHint()}</span>
		</SelectionBar>
	{/if}

	<PrintHeader title={label} searchPattern={grid.search} />

	<div class="min-w-0">
		{#if grid.applied.grouping.length > 0}
			<GroupedGrid {grid} {source} {label} onfilter={() => openPanel('filter')} {...rowProps} />
		{:else}
			<FlatGrid
				{grid}
				{source}
				{label}
				{emptyText}
				onfilter={() => openPanel('filter')}
				onSoleMatch={soleMatch}
				{...rowProps}
			/>
		{/if}
	</div>
</div>

<FilterPanel bind:open={filterOpen} {grid} />
<GroupByPanel bind:open={groupOpen} {grid} />
<ColumnPanel bind:open={columnsOpen} {grid} />
