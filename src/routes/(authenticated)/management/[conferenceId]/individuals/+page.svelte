<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	// import PrintHeader from '$lib/components/DataTable/PrintHeader.svelte';
	import { type TableColumns } from 'svelte-table';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import { getTableSettings } from '$lib/components/DataTable/dataTableSettings.svelte';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import IndividualDrawer from './IndividualDrawer.svelte';
	import { queryParam } from 'sveltekit-search-params';
	import { openUserCard } from '$lib/components/UserCard/userCardState.svelte';

	const { data }: { data: PageData } = $props();
	const queryData = $derived(data.ConferenceSingleParticipantsQuery);
	const singleParticipants = $derived($queryData?.data?.findManySingleParticipants ?? []);
	const { getTableSize } = getTableSettings();

	let selectedParticipantRow = queryParam('selected');

	const columns: TableColumns<(typeof singleParticipants)[number]> = [
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
			key: 'applied',
			title: 'Applied',
			value: (row) => (row.applied ? 1 : 0),
			renderValue: (row) =>
				row.applied
					? `<i class="fa-solid fa-circle-check text-success text-${getTableSize()}"></i>`
					: `<i class="fa-solid fa-hourglass-half text-warning text-${getTableSize()}"></i>`,
			parseHTML: true,
			sortable: true,
			class: 'text-center'
		},
		{
			key: 'roleApplications',
			title: m.roleApplications(),
			renderValue: (row) => {
				if (row.appliedForRoles.length === 0) return 'N/A';
				return `
				<div class="flex flex gap-2 justify-center items-center">
				${row.appliedForRoles
					.map(
						(r) => `
						<div class="tooltip" data-tip="${r.name}">
						<i class="fa-duotone fa-${r.fontAwesomeIcon?.replace('fa-', '')} text-${getTableSize()}"></i>
						</div>
				`
					)
					.join('')}</ul>`;
			},
			parseHTML: true,
			class: 'text-center'
		},
		{
			key: 'role',
			title: m.role(),
			parseHTML: true,
			renderValue: (row) => `
						<div class="tooltip" data-tip="${row?.assignedRole?.name}">
						<i class="fa-duotone fa-${row?.assignedRole?.fontAwesomeIcon?.replace('fa-', '')} text-${getTableSize()}"></i>
						</div>
				`
		},
		{
			key: 'school',
			title: m.schoolOrInstitution(),
			value: (row) => row.school ?? 'N/A',
			sortable: true,
			class: 'max-w-[30ch] truncate'
		},
		{
			key: 'motivation',
			title: m.motivation(),
			value: (row) => row.motivation ?? 'N/A',
			class: 'max-w-[20ch] truncate'
		},
		{
			key: 'experience',
			title: m.experience(),
			value: (row) => row.experience ?? 'N/A',
			class: 'max-w-[20ch] truncate'
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
		rows={singleParticipants}
		enableSearch={true}
		queryParamKey="filter"
		rowSelected={(row) => {
			$selectedParticipantRow = row.id;
		}}
	/>
</div>

{#if $selectedParticipantRow}
	<IndividualDrawer
		singleParticipantId={$selectedParticipantRow}
		conferenceId={data.conferenceId}
		open={$selectedParticipantRow !== null}
		onClose={() => ($selectedParticipantRow = null)}
	/>
{/if}
