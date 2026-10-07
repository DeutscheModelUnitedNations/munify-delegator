<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { renderComponent } from '$lib/components/tanStackTable';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import { nameColumn, userCardColumn } from '$lib/components/tanStackTable/commonColumns';
	import IconCell from '$lib/components/tanStackTable/cells/IconCell.svelte';
	import RegistrationAdminTable from '$lib/components/registrationAdmin/RegistrationAdminTable.svelte';
	import SupervisorDrawer from './SupervisorDrawer.svelte';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const supervisors = $derived(
		await client.liveQuery.conferenceSupervisors({
			__args: { where: { conferenceId: { eq: routeParams.conferenceId } } },
			id: true,
			plansOwnAttendenceAtConference: true,
			user: { id: true, familyName: true, givenName: true },
			supervisedDelegationMembers: { id: true },
			supervisedSingleParticipants: { id: true }
		})
	);
	const columns: ManagedColumn<(typeof supervisors)[number]>[] = [
		nameColumn(),
		{
			id: 'plansAttendance',
			header: m.adminPlansAttendance(),
			accessorFn: (row) => (row.plansOwnAttendenceAtConference ? 1 : 0),
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
			accessorFn: (row) => row.supervisedDelegationMembers.length
		},
		{
			id: 'singleParticipants',
			header: m.adminSingleParticipants(),
			accessorFn: (row) => row.supervisedSingleParticipants.length
		},
		{
			id: 'totalSupervisedParticipants',
			header: m.participants(),
			accessorFn: (row) =>
				row.supervisedSingleParticipants.length + row.supervisedDelegationMembers.length
		},
		userCardColumn()
	];

	const columnClasses = Object.fromEntries(
		['plansAttendance', 'delegations', 'singleParticipants', 'totalSupervisedParticipants'].map(
			(id) => [id, 'text-center']
		)
	);

	// TODO export data
</script>

<RegistrationAdminTable {columns} {columnClasses} rows={supervisors} category={m.supervisor()}>
	{#snippet drawer(selectedId, close)}
		<SupervisorDrawer
			supervisorId={selectedId}
			conferenceId={routeParams.conferenceId}
			open
			onClose={close}
		/>
	{/snippet}
</RegistrationAdminTable>
