<script lang="ts">
	import TableSearch from '$lib/components/DataTable/TableSearch.svelte';
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import PrintHeader from '$lib/components/DataTable/PrintHeader.svelte';
	import Drawer from './DelegationDrawer.svelte';
	import SvelteTable, { type TableColumns } from 'svelte-table';
	import type { Delegation } from '@prisma/client';
	import * as m from '$lib/paraglide/messages';
	import { getTableSettings } from '$lib/components/DataTable/tableSettings.svelte';

	type DelegationDataWithCount = Delegation & {
		_count: {
			members: number;
			supervisors: number;
			appliedForRoles: number;
		};
	};

	const { data } = $props();

	let delegations = $state<DelegationDataWithCount[]>(data.delegations);

	const columns: TableColumns<DelegationDataWithCount> = [
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
			key: 'school',
			title: m.schoolOrInstitution(),
			value: (row) => row.school ?? 'N/A',
			sortable: true,
			class: 'max-w-[30ch] truncate'
		},
		{
			key: 'members',
			title: m.members(),
			value: (row) => row._count.members,
			sortable: true,
			class: 'text-center'
		},
		{
			key: 'supervisors',
			title: m.supervisors(),
			value: (row) => row._count.supervisors,
			sortable: true,
			class: 'text-center'
		},
		{
			key: 'appliedForRoles',
			title: m.roleApplications(),
			value: (row) => row._count.appliedForRoles,
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

	const { getTableSize, getZebra } = getTableSettings();

	let filterValue = $state<string>(data.idQuery ?? '');

	$effect(() => {
		if (filterValue !== '') {
			delegations = data.delegations.filter((u) => {
				const search = filterValue!.toLowerCase();
				return (
					(u.entryCode && u.entryCode.toLowerCase().includes(search)) ||
					(u.school && u.school.toLowerCase().includes(search)) ||
					(u.motivation && u.motivation.toLowerCase().includes(search)) ||
					(u.experience && u.experience.toLowerCase().includes(search)) ||
					(u.id && u.id.toLowerCase().includes(search))
				);
			});
		} else {
			delegations = data.delegations;
		}
	});

	const exportedData = $derived(() => {
		return [
			...delegations.map((p) => ({
				'Entry Code': p.entryCode,
				Applied: p.applied ? 'Yes' : 'No',
				School: p.school ?? 'N/A',
				Members: p._count.members.toString(),
				Supervisors: p._count.supervisors.toString(),
				Roles: p._count.appliedForRoles.toString(),
				Motivation: p.motivation ?? 'N/A',
				Experience: p.experience ?? 'N/A'
			}))
		];
	});

	let drawerDelegation = $state<DelegationDataWithCount | null>(
		data.idQuery ? (delegations.find((u) => u.id === data.idQuery) ?? null) : null
	);
</script>

<ManagementHeader title={m.adminDelegations()} exportedData={exportedData()} tableOptions logoutUrl={data.logoutUrl} />
<PrintHeader title={m.adminDelegations()} globalSearchValue={filterValue ?? undefined} />

<TableSearch searchValue={filterValue} changeSearchValue={(v) => (filterValue = v)} />

<div class="mt-4 overflow-x-auto">
	<SvelteTable
		{columns}
		rows={delegations}
		rowKey="id"
		classNameTable="table {getZebra() && 'table-zebra'} table-{getTableSize()} table-pin-rows"
		classNameRow="hover:!bg-base-300 cursor-pointer"
		on:clickRow={(e) => (drawerDelegation = e.detail.row)}
		iconAsc="<i class='fa-duotone fa-arrow-down-a-z'></i>"
		iconDesc="<i class='fa-duotone fa-arrow-down-z-a'></i>"
		iconSortable="<i class='fa-solid fa-sort'></i>"
		sortBy="family_name"
	/>
</div>

<Drawer delegation={drawerDelegation} onClose={() => (drawerDelegation = null)} {data} />
