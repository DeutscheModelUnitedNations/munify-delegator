<script lang="ts">
	import { untrack } from 'svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import { client } from '#lib/api/rumbleClient/client';
	import DataGrid from '#lib/components/dataGrid/DataGrid.svelte';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { participantColumns } from './columns';
	import { fetchNationOptions, participantsSource } from './participantsSource';
	import { participantsBase } from './participantsBase';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	// Read once: the team shell keys each page by its pathname, so this instance never changes
	// conference. Read live, the page's queries re-ran inside hydration's pending batch, which still
	// shows `params` as `{}`, and asked for conference ''.
	const conferenceId = untrack(() => routeParams.conferenceId);

	/** `?highlight=<userId>` marks one row, as links from the assignment sighting do. */
	const params = queryParameters({ highlight: true });

	// The base view depends on the conference's state, so it is known before the grid opens.
	const conference = await client.query.conference({ __args: { id: conferenceId }, state: true });
	const nations = $derived(await fetchNationOptions(conferenceId));
	const columns = $derived(participantColumns({ nations }));
	const source = participantsSource(conferenceId);
</script>

<DataGrid
	{columns}
	{source}
	rowId={(row) => row.userId}
	base={participantsBase(conference?.state)}
	views={{ table: 'participants', conferenceId }}
	label={m.adminUsers()}
	exportName="participants"
	selectable
	openSoleMatch
	onRowClick={(row) => openUserCard(row.userId)}
	isRowHighlighted={(row) => row.userId === params.highlight}
/>
