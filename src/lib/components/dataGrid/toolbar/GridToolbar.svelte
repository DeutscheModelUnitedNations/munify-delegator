<script lang="ts" generics="Row">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { activeConditionCount } from '#lib/dataGrid/filterEdit';
	import type { GridState } from '../gridState.svelte';
	import type { TableExport } from '../exportRows';
	import ExportButton from './ExportButton.svelte';
	import PanelButton from './PanelButton.svelte';
	import SearchBox from './SearchBox.svelte';
	import SettingsButton from './SettingsButton.svelte';

	/**
	 * The row above the table: the search, the page's own controls, the views, the panels for
	 * filter, grouping and columns, the display settings and the export.
	 */
	interface Props {
		grid: GridState<Row>;
		exportName: string;
		getExport: () => Promise<TableExport>;
		onpanel: (panel: 'filter' | 'group' | 'columns') => void;
		/** The views menu, where the table has saved views */
		views?: Snippet;
		/** The page's own controls */
		extra?: Snippet;
	}

	let { grid, exportName, getExport, onpanel, views, extra }: Props = $props();

	const conditions = $derived(
		activeConditionCount({ filter: grid.state.filter, columns: grid.columns })
	);
	const searchBusy = $derived(grid.typedSearch.trim() !== grid.search);
</script>

<!-- On a phone the search takes a row of its own and the controls wrap below it. -->
<div class="flex min-w-0 flex-wrap items-center gap-2">
	<SearchBox
		value={grid.typedSearch}
		busy={searchBusy}
		oninput={(value) => grid.setSearch(value)}
	/>
	{@render extra?.()}
	{@render views?.()}
	<PanelButton
		label={m.filters()}
		icon="fa-filter"
		count={conditions}
		onclick={() => onpanel('filter')}
	/>
	<PanelButton
		label={m.dataGridGroupBy()}
		icon="fa-layer-group"
		count={grid.state.grouping.length}
		onclick={() => onpanel('group')}
	/>
	<PanelButton label={m.columns()} icon="fa-columns" onclick={() => onpanel('columns')} />
	<!-- Kept together, so a wrapping toolbar never leaves the export alone on a row -->
	<div class="flex items-center gap-1 max-sm:ml-auto sm:gap-2">
		<SettingsButton />
		<ExportButton filename={exportName} {getExport} />
	</div>
</div>
