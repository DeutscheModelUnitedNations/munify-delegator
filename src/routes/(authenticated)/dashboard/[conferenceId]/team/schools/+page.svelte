<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import type { ManagedColumn } from '#lib/components/tanStackTable/managedTable';
	import ManagedTable from '#lib/components/tanStackTable/ui/ManagedTable.svelte';
	import { createTableState } from '#lib/components/tanStackTable/tableState.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { fetchAllSchools, fetchSchoolsPage, type SchoolRow } from './schoolsQuery';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const conferenceId = $derived(params.conferenceId);

	// Set up before the first await: afterwards a server render has no request to read the URL of.
	// Search, order and paging run in the backend; the table only holds this page.
	const tableState = createTableState({
		pageSize: 50,
		initialSorting: [{ id: 'participants', desc: true }]
	});

	const conference = $derived(
		await client.liveQuery.conference({ __args: { id: conferenceId }, maxSeatsPerSchool: true })
	);
	const limit = $derived(conference.maxSeatsPerSchool ?? null);
	const page = $derived(await fetchSchoolsPage(conferenceId, tableState));

	const count = (value: unknown) => (typeof value === 'number' && value > 0 ? String(value) : '—');

	const columns: ManagedColumn<SchoolRow>[] = $derived([
		{ accessorKey: 'name', header: m.school(), enableSorting: true },
		{
			accessorKey: 'city',
			header: m.city(),
			cell: ({ getValue }) => getValue<string | null>() ?? '—',
			enableSorting: true
		},
		{
			accessorKey: 'delegations',
			header: m.delegations(),
			cell: ({ getValue }) => count(getValue()),
			enableSorting: true
		},
		{
			accessorKey: 'participants',
			header: m.schoolsParticipants(),
			cell: ({ getValue }) => count(getValue()),
			enableSorting: true
		},
		{
			accessorKey: 'applied',
			header: m.schoolsApplied(),
			cell: ({ getValue }) => count(getValue()),
			enableSorting: true
		},
		{
			accessorKey: 'seated',
			header: m.schoolsSeated(),
			cell: ({ getValue }) => {
				const seats = getValue<number>();
				return limit !== null && seats > limit ? `⚠ ${seats} / ${limit}` : count(seats);
			},
			enableSorting: true
		},
		{
			accessorKey: 'supervisors',
			header: m.supervisors(),
			cell: ({ getValue }) => count(getValue()),
			enableSorting: true
		},
		{
			accessorKey: 'waitingList',
			header: m.waitingList(),
			cell: ({ getValue }) => count(getValue()),
			enableSorting: true
		}
	]);

	const columnClasses = Object.fromEntries(
		['delegations', 'participants', 'applied', 'seated', 'supervisors', 'waitingList'].map((id) => [
			id,
			'text-center tabular-nums'
		])
	);
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

	<ManagedTable
		{columns}
		rows={page.rows}
		{columnClasses}
		{tableState}
		hasMore={page.hasMore}
		rowCount={page.total}
		exportRows={() => fetchAllSchools(conferenceId, tableState)}
		storageKey="schools-columns-{conferenceId}"
		onRowClick={(row) => goto(resolve(`dashboard/${conferenceId}/team/schools/${row.schoolId}`))}
	/>
</div>
