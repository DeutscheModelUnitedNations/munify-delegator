<script lang="ts">
	import ManagedTable from '$lib/components/tanStackTable/ui/ManagedTable.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { fetchConferenceParticipants } from './conferenceParticipants';
	import type { ParticipantRow } from './types';
	import { transformParticipants } from './dataTransform';
	import { createColumnDefs, participantGroupOrder } from './columns';
	import { defaultColumnFilters } from './tableState';
	import TableToolbar from './TableToolbar.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const conferenceId = $derived(routeParams.conferenceId ?? '');

	const registrations = $derived(await fetchConferenceParticipants(conferenceId));
	const conference = $derived(registrations.conference);
	const conferenceState = $derived(conference?.state);
	const startConference = $derived(conference?.startConference);
	const endConference = $derived(conference?.endConference);

	const participants: ParticipantRow[] = $derived.by(() => {
		return transformParticipants(registrations, startConference, endConference);
	});

	const columns = createColumnDefs();

	/** `?highlight=<userId>` marks one row, as links from the assignment sighting do. */
	const params = queryParameters({ highlight: true });
</script>

<ManagedTable
	{columns}
	rows={participants}
	title="participants"
	queryParamKey="search"
	storageKey="participants-columns-{conferenceId}"
	groupOrder={participantGroupOrder()}
	searchColumns={['family_name', 'given_name', 'email']}
	defaultFilters={defaultColumnFilters(conferenceState)}
	initialSorting={[{ id: 'family_name', desc: false }]}
	pageSize={20}
	onRowClick={(row) => openUserCard(row.userId)}
	isRowSelected={(row) => row.userId === params.highlight}
>
	{#snippet toolbar(table)}
		<TableToolbar {table} />
	{/snippet}
</ManagedTable>
