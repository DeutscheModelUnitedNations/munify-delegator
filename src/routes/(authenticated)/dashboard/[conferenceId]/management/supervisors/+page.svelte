<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import { m } from '$lib/paraglide/messages';
	import { createTableState } from '$lib/components/tanStackTable/tableState.svelte';
	import { fetchAllSupervisors, fetchSupervisorsPage } from './supervisorsQuery';
	import { renderComponent } from '$lib/components/tanStackTable';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import { nameColumn, userCardColumn } from '$lib/components/tanStackTable/commonColumns';
	import IconCell from '$lib/components/tanStackTable/cells/IconCell.svelte';
	import RegistrationAdminTable from '$lib/components/registrationAdmin/RegistrationAdminTable.svelte';
	import SupervisorDrawer from './SupervisorDrawer.svelte';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	// Navigations (the table's own URL state is one) hand over fresh params; reading them inside an
	// awaited derived would refetch from whatever state the batch under way still shows.
	const conferenceId = $derived(routeParams.conferenceId);

	// Search, filters, order and paging run in the backend; the table only holds this page.
	const tableState = createTableState();
	const fetched = $derived(await fetchSupervisorsPage(conferenceId, tableState));
	const supervisors = $derived(fetched.rows);

	const exportRows = () => fetchAllSupervisors(conferenceId, tableState);
	const columns: ManagedColumn<(typeof supervisors)[number]>[] = [
		{ ...nameColumn(), enableSorting: false },
		{
			id: 'plansAttendance',
			header: m.adminPlansAttendance(),
			accessorFn: (row) => (row.plansOwnAttendenceAtConference ? 1 : 0),
			filter: { type: 'boolean' },
			cell: ({ row }) =>
				renderComponent(IconCell, {
					icon: row.original.plansOwnAttendenceAtConference
						? 'fa-duotone fa-location-check'
						: 'fa-duotone fa-cloud'
				})
		},
		{
			id: 'delegations',
			header: m.delegationMembers(),
			accessorFn: (row) => row.supervisedDelegationMembers.length,
			enableSorting: false
		},
		{
			id: 'singleParticipants',
			header: m.adminSingleParticipants(),
			accessorFn: (row) => row.supervisedSingleParticipants.length,
			enableSorting: false
		},
		{
			id: 'totalSupervisedParticipants',
			header: m.participants(),
			accessorFn: (row) =>
				row.supervisedSingleParticipants.length + row.supervisedDelegationMembers.length,
			enableSorting: false
		},
		userCardColumn()
	];

	const columnClasses = Object.fromEntries(
		['plansAttendance', 'delegations', 'singleParticipants', 'totalSupervisedParticipants'].map(
			(id) => [id, 'text-center']
		)
	);
</script>

<RegistrationAdminTable
	{columns}
	{columnClasses}
	rows={supervisors}
	{tableState}
	hasMore={fetched.hasMore}
	rowCount={fetched.total}
	{exportRows}
	category={m.supervisor()}
>
	{#snippet drawer(selectedId, close)}
		<SupervisorDrawer
			supervisorId={selectedId}
			conferenceId={routeParams.conferenceId}
			open
			onClose={close}
		/>
	{/snippet}
</RegistrationAdminTable>
