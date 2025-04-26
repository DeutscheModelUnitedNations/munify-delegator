<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	// import PrintHeader from '$lib/components/DataTable/PrintHeader.svelte';
	import { type TableColumns } from 'svelte-table';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import { getTableSettings } from '$lib/components/DataTable/dataTableSettings.svelte';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import DelegationDrawer from './DelegationDrawer.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';

	const { data }: { data: PageData } = $props();
	const queryData = $derived(data.ConferenceDelegationsQuery);
	const delegations = $derived(
		$queryData?.data?.findManyDelegations.map((d) => ({
			...d,
			assignedNation: d.assignedNation
				? {
						...d.assignedNation,
						name: getFullTranslatedCountryNameFromISO3Code(d.assignedNation.alpha3Code)
					}
				: undefined
		})) ?? []
	);
	const { getTableSize } = getTableSettings();

	const columns: TableColumns<(typeof delegations)[number]> = [
		{
			key: 'entryCode',
			title: 'Entry Code',
			value: (row) => row.entryCode,
			class: 'font-mono'
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
			key: 'role',
			title: m.role(),
			parseHTML: true,
			value: (row) => row.assignedNation?.name ?? row.assignedNonStateActor?.name ?? 'N/A',
			renderValue: (row) =>
				row.assignedNation
					? `<div class="w-[2rem] h-[1.5rem] rounded flex items-center justify-center overflow-hidden shadow bg-base-300 tooltip" data-tip="${row.assignedNation.name}"><span class="fi fi-${row.assignedNation.alpha2Code} !w-full !leading-[100rem]"></span></div>`
					: row.assignedNonStateActor &&
						`<div class="w-[2rem] h-[1.5rem] rounded flex items-center justify-center overflow-hidden shadow bg-base-300 tooltip" data-tip="${row.assignedNonStateActor.name}"><span class="fas fa-${row.assignedNonStateActor?.fontAwesomeIcon?.replace('fa-', '')}"></span></div>`,
			sortable: true,
			class: 'text-center'
		},
		{
			key: 'school',
			title: m.schoolOrInstitution(),
			value: (row) => row.school ?? 'N/A',
			sortable: true,
			class: 'max-w-[30ch] truncate'
		},
		{
			key: 'members',
			title: m.members(),
			value: (row) => row.members.length,
			sortable: true,
			class: 'text-center'
		},
		{
			key: 'supervisors',
			title: m.supervisors(),
			value: (row) => row.supervisors.length,
			sortable: true,
			class: 'text-center'
		},
		{
			key: 'appliedForRoles',
			title: m.roleApplications(),
			value: (row) => row.appliedForRoles.length,
			sortable: true,
			class: 'text-center'
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
		}
	];

	let selectedDelegationRow = $state<(typeof delegations)[number]>();
	// TODO export data
</script>

<DataTable
	{columns}
	rows={delegations}
	enableSearch={true}
	additionallyIndexedKeys={['assignedNation.name']}
	queryParamKey="filter"
	rowSelected={(row) => {
		selectedDelegationRow = row;
	}}
/>

{#if selectedDelegationRow}
	<DelegationDrawer
		delegationId={selectedDelegationRow.id}
		conferenceId={data.conferenceId}
		open={selectedDelegationRow !== undefined}
		onClose={() => (selectedDelegationRow = undefined)}
		userData={data.user}
	/>
{/if}
