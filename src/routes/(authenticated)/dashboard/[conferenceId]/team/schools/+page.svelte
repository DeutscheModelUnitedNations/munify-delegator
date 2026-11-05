<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import DataGrid from '#lib/components/dataGrid/DataGrid.svelte';
	import { m } from '#lib/paraglide/messages';
	import { schoolColumns } from './columns';
	import { schoolsSource } from './schoolsSource';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Read once: the team shell keys each page by its pathname, so this instance never changes
	// conference.
	const conferenceId = untrack(() => params.conferenceId);

	const conference = $derived(
		await client.liveQuery.conference({ __args: { id: conferenceId }, maxSeatsPerSchool: true })
	);
	const limit = $derived(conference.maxSeatsPerSchool ?? null);
	const columns = $derived(schoolColumns({ seatLimit: limit }));
	const source = schoolsSource(conferenceId);
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1">
		<h2 class="text-2xl font-bold">{m.schools()}</h2>
		<p class="text-base-content/70 max-w-prose text-sm">{m.schoolsPageDescription()}</p>
	</div>

	{#if limit !== null}
		<p class="text-sm">
			<i class="fa-sharp-duotone fa-solid fa-scale-balanced"></i>
			{m.schoolsSeatLimitNote({ limit })}
		</p>
	{/if}

	<DataGrid
		{columns}
		{source}
		rowId={(row) => row.id}
		base={{ sorting: [{ id: 'participants', desc: true }], pageSize: 50 }}
		views={{ table: 'schools', conferenceId }}
		label={m.schools()}
		exportName="schools"
		selectable
		onRowClick={(row) => goto(resolve(`dashboard/${conferenceId}/team/schools/${row.id}`))}
	/>
</div>
