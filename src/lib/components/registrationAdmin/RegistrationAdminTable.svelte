<script lang="ts" generics="T extends { id: string }">
	import type { Snippet } from 'svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import ManagedTable from '$lib/components/tanStackTable/ui/ManagedTable.svelte';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import Drawer from '$lib/components/Drawer.svelte';

	/**
	 * A management table whose rows open a drawer, kept in the `selected` URL parameter.
	 */
	interface Props {
		columns: ManagedColumn<T>[];
		rows: T[];
		/** Extra classes for a column's header and cells, by column id */
		columnClasses?: Record<string, string>;
		/** Category of the placeholder drawer shown while the real one loads */
		category: string;
		/** Id and title the placeholder drawer can already show */
		pendingHeader?: (selectedId: string) => { id: string; title: string };
		/** The drawer for the selected row */
		drawer: Snippet<[selectedId: string, close: () => void]>;
	}

	let { columns, rows, columnClasses, category, pendingHeader, drawer }: Props = $props();

	const params = queryParameters({ selected: true });

	const close = () => (params.selected = null);
</script>

<ManagedTable
	{columns}
	{rows}
	{columnClasses}
	queryParamKey="filter"
	onRowClick={(row) => {
		params.selected = row.id;
	}}
	isRowSelected={(row) => row.id === params.selected}
/>

{#if params.selected}
	{@const selectedId = params.selected}
	{#key selectedId}
		<svelte:boundary>
			{@render drawer(selectedId, close)}

			{#snippet pending()}
				<Drawer open loading {category} {...pendingHeader?.(selectedId)} onClose={close}>
					<div></div>
				</Drawer>
			{/snippet}
		</svelte:boundary>
	{/key}
{/if}
