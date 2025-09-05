<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	// import PrintHeader from '$lib/components/DataTable/PrintHeader.svelte';
	import { type TableColumns } from 'svelte-table';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import { getTableSettings } from '$lib/components/DataTable/dataTableSettings.svelte';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import IndividualDrawer from './SupervisorDrawer.svelte';

	const { data }: { data: PageData } = $props();
	const queryData = $derived(data.ConferenceSupervisorsQuery);
	const supervisors = $derived($queryData?.data?.findManyConferenceSupervisors ?? []);
	const { getTableSize } = getTableSettings();

	const columns: TableColumns<(typeof supervisors)[number]> = [
		{
			key: 'name',
			title: m.name(),
			value: (row) => `${row.user.family_name} ${row.user.given_name} `,
			renderValue: (row) =>
				`<span class="uppercase">${row.user.family_name}</span> ${row.user.given_name} `,
			sortable: true,
			parseHTML: true
		},
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
			value: (row) => row.supervisedDelegationMembers?.length,
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
		}
	];

	let selectedSupervisorRow = $state<(typeof supervisors)[number]>();
	// TODO export data
</script>

<DataTable
	{columns}
	rows={supervisors}
	enableSearch={true}
	queryParamKey="filter"
	rowSelected={(row) => {
		selectedSupervisorRow = row;
	}}
/>

{#if selectedSupervisorRow}
	<IndividualDrawer
		supervisorId={selectedSupervisorRow.id}
		conferenceId={data.conferenceId}
		open={selectedSupervisorRow !== undefined}
		onClose={() => (selectedSupervisorRow = undefined)}
	/>
{/if}
