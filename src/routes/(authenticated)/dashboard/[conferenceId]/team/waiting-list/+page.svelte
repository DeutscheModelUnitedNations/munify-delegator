<script lang="ts">
	import { untrack } from 'svelte';
	import DataGrid from '#lib/components/dataGrid/DataGrid.svelte';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { WAITING_LIST_BASE, waitingListColumns } from './columns';
	import WaitingListActions from './WaitingListActions.svelte';
	import { waitingListSource } from './waitingListSource';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Read once: the team shell keys each page by its pathname, so this instance never changes
	// conference. Read live, a navigation of the table's own URL state re-ran the queries inside a
	// pending batch, which still shows `params` as `{}`, and asked for no conference.
	const conferenceId = untrack(() => params.conferenceId);

	const columns = waitingListColumns();
	const source = waitingListSource(conferenceId);
</script>

<!-- Hidden and seated entries are filters of the base view; a view can show them. -->
<DataGrid
	{columns}
	{source}
	rowId={(row) => row.id}
	base={WAITING_LIST_BASE}
	views={{ table: 'waitingList', conferenceId }}
	label={m.waitingList()}
	exportName="waiting-list"
	selectable
	onRowClick={(row) => openUserCard(row.userId)}
	actionsWidth={110}
>
	{#snippet actions(row)}
		<WaitingListActions entryId={row.id} userId={row.userId} {conferenceId} hidden={row.hidden} />
	{/snippet}
</DataGrid>
