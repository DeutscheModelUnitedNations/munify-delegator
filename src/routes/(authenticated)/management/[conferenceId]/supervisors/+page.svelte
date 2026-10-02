<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	// import PrintHeader from '$lib/components/dataTable/PrintHeader.svelte';
	import { type TableColumns } from 'svelte-table';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { getTableSettings } from '$lib/components/dataTable/dataTableSettings.svelte';
	import { nameColumn, userCardColumn } from '$lib/components/dataTable/commonColumns';
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
	const { getTableSize } = getTableSettings();

	const columns: TableColumns<(typeof supervisors)[number]> = [
		nameColumn(),
		{
			key: 'plansAttendance',
			title: m.adminPlansAttendance(),
			value: (row) => (row.plansOwnAttendenceAtConference ? 1 : 0),
			renderValue: (row) =>
				row.plansOwnAttendenceAtConference
					? `<i class="fa-duotone fa-location-check text-${getTableSize()}"></i>`
					: `<i class="fa-duotone fa-cloud text-${getTableSize()}"></i>`,
			parseHTML: true,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'delegations',
			title: m.delegationMembers(),
			value: (row) => row.supervisedDelegationMembers.length,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'singleParticipants',
			title: m.adminSingleParticipants(),
			value: (row) => row.supervisedSingleParticipants.length,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'totalSupervisedParticipants',
			title: m.participants(),
			value: (row) =>
				row.supervisedSingleParticipants.length + row.supervisedDelegationMembers.length,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		userCardColumn()
	];

	// TODO export data
</script>

<RegistrationAdminTable
	conferenceId={routeParams.conferenceId}
	{columns}
	rows={supervisors}
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
