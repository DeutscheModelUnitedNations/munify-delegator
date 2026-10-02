<script lang="ts" generics="T extends { id: string }">
	import type { Snippet } from 'svelte';
	import type { TableColumns } from 'svelte-table';
	import { queryParameters } from 'sveltekit-search-params';
	import DataTable from '$lib/components/dataTable/DataTable.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';

	/**
	 * A management table whose rows open a drawer, kept in the `selected` URL parameter. Buttons
	 * rendered by `userCardColumn` open the person's user card.
	 */
	interface Props {
		conferenceId: string;
		columns: TableColumns<T>;
		rows: T[];
		additionallyIndexedKeys?: string[];
		/** Category of the placeholder drawer shown while the real one loads */
		category: string;
		/** Id and title the placeholder drawer can already show */
		pendingHeader?: (selectedId: string) => { id: string; title: string };
		/** The drawer for the selected row */
		drawer: Snippet<[selectedId: string, close: () => void]>;
	}

	let {
		conferenceId,
		columns,
		rows,
		additionallyIndexedKeys,
		category,
		pendingHeader,
		drawer
	}: Props = $props();

	const params = queryParameters({ selected: true });

	const close = () => (params.selected = null);

	function openUserCardFromTable(e: MouseEvent) {
		const btn = e.target instanceof Element ? e.target.closest('.usercard-btn') : null;
		if (btn) {
			e.stopPropagation();
			const userId = btn.getAttribute('data-userid');
			if (userId) openUserCard(userId, conferenceId);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div onclick={openUserCardFromTable}>
	<DataTable
		{columns}
		{rows}
		enableSearch={true}
		{additionallyIndexedKeys}
		queryParamKey="filter"
		rowSelected={(row) => {
			params.selected = row.id;
		}}
	/>
</div>

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
