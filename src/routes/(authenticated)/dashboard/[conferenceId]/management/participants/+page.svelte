<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import ManagedTable from '$lib/components/tanStackTable/ui/ManagedTable.svelte';
	import { columnIdOf } from '$lib/components/tanStackTable/managedTable';
	import { createTableState } from '$lib/components/tanStackTable/tableState.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { createColumnDefs, participantGroupOrder } from './columns';
	import { defaultColumnFilters } from './tableState';
	import {
		fetchAllParticipants,
		fetchParticipantsPage,
		type FilterKind
	} from './participantsQuery';
	import TableToolbar from './TableToolbar.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const conferenceId = $derived(routeParams.conferenceId ?? '');

	// Everything that reads the URL is set up before the first await: after it, the component has
	// no request to read the URL of while it renders on the server.
	// Search, filters, order and paging run in the backend, which picks the people of this page;
	// the table only holds their rows.
	const tableState = createTableState({
		searchKey: 'search',
		pageSize: 20,
		initialSorting: [{ id: 'family_name', desc: false }],
		defaultFilters: () => defaultColumnFilters(conferenceState)
	});
	/** `?highlight=<userId>` marks one row, as links from the assignment sighting do. */
	const params = queryParameters({ highlight: true });

	const conference = $derived(
		await client.liveQuery.conference({ __args: { id: conferenceId }, state: true })
	);
	const conferenceState = $derived(conference?.state);

	const columns = createColumnDefs();
	const filterKinds = new Map<string, FilterKind>(
		columns.flatMap((column) => {
			const id = columnIdOf(column);
			return id !== undefined && column.filter ? [[id, column.filter.type] as const] : [];
		})
	);

	const source = $derived({ conferenceId, state: tableState, kinds: filterKinds });
	const page = $derived(await fetchParticipantsPage(source));
</script>

<ManagedTable
	{columns}
	rows={page.rows}
	{tableState}
	hasMore={page.hasMore}
	rowCount={page.total}
	exportRows={() => fetchAllParticipants(source)}
	title="participants"
	queryParamKey="search"
	storageKey="participants-columns-{conferenceId}"
	groupOrder={participantGroupOrder()}
	onRowClick={(row) => openUserCard(row.userId)}
	isRowSelected={(row) => row.userId === params.highlight}
>
	{#snippet toolbar(table)}
		<TableToolbar {table} />
	{/snippet}
</ManagedTable>
