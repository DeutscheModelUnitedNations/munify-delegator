<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	// import PrintHeader from '$lib/components/DataTable/PrintHeader.svelte';
	import { type TableColumns } from 'svelte-table';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import { getTableSettings } from '$lib/components/DataTable/dataTableSettings.svelte';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import IndividualDrawer from './SupervisorDrawer.svelte';
	import { queryParam } from 'sveltekit-search-params';
	import { openUserCard } from '$lib/components/UserCard/userCardState.svelte';

	const { data }: { data: PageData } = $props();
	const queryData = $derived(data.ConferenceSupervisorsQuery);
	const supervisors = $derived($queryData?.data?.findManyConferenceSupervisors ?? []);
	const { getTableSize } = getTableSettings();

	let selectedSupervisorId = queryParam('selected');
	let filter = queryParam('filter');

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
		},
		{
			key: 'userCard',
			title: '',
			renderValue: (row) =>
				`<button class="btn btn-ghost btn-xs btn-square usercard-btn" data-userid="${row.user.id}" aria-label="Open user card"><i class="fa-duotone fa-id-card"></i></button>`,
			parseHTML: true,
			class: 'text-center w-10 print:hidden'
		}
	];

	// TODO export data
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	onclick={(e) => {
		const btn = e.target instanceof Element ? e.target.closest('.usercard-btn') : null;
		if (btn) {
			e.stopPropagation();
			const userId = btn.getAttribute('data-userid');
			if (userId) openUserCard(userId, data.conferenceId);
		}
	}}
>
	<DataTable
		{columns}
		rows={supervisors}
		enableSearch={true}
		queryParamKey="filter"
		rowSelected={(row) => {
			$selectedSupervisorId = row.id;
		}}
	/>
</div>

{#if $selectedSupervisorId}
	<IndividualDrawer
		supervisorId={$selectedSupervisorId}
		conferenceId={data.conferenceId}
		open={$selectedSupervisorId !== null}
		onClose={() => ($selectedSupervisorId = null)}
	/>
{/if}
