<script lang="ts">
	import TableSearch from '$lib/components/DataTable/TableSearch.svelte';
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import PrintHeader from '$lib/components/DataTable/PrintHeader.svelte';
	import Drawer from './SupervisorDrawer.svelte';
	import SvelteTable, { type TableColumns } from 'svelte-table';
	import type { ConferenceSupervisorData } from './+page.ts';
	import * as m from '$lib/paraglide/messages';
	import { getTableSettings } from '$lib/components/DataTable/tableSettings.svelte';

	const { data } = $props();

	let supervisors = $state<ConferenceSupervisorData[]>(data.supervisors);

	const columns: TableColumns<ConferenceSupervisorData> = [
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
			title: m.adminDelegations(),
			value: (row) => row._count.delegations,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		}
	];

	const { getTableSize, getZebra } = getTableSettings();

	let filterValue = $state<string>(data.idQuery ?? '');

	$effect(() => {
		if (filterValue !== '') {
			supervisors = data.supervisors.filter((u) => {
				const search = filterValue!.toLowerCase();
				return (
					(u.id && u.id.toLowerCase().includes(search)) ||
					(u.user.given_name && u.user.given_name.toLowerCase().includes(search)) ||
					(u.user.family_name && u.user.family_name.toLowerCase().includes(search))
				);
			});
		} else {
			supervisors = data.supervisors;
		}
	});

	const exportedData = $derived(() => {
		return [
			...supervisors.map((p) => ({
				name: `${p.user.family_name} ${p.user.given_name}`,
				plansAttendance: p.plansOwnAttendenceAtConference ? 'Yes' : 'No',
				delegations: p._count.delegations.toString()
			}))
		];
	});

	let supervisor = $state<ConferenceSupervisorData | null>(
		data.idQuery ? (supervisors.find((u) => u.id === data.idQuery) ?? null) : null
	);
</script>

<ManagementHeader
	title={m.adminSupervisors()}
	exportedData={exportedData()}
	tableOptions
	logoutUrl={data.logoutUrl}
/>
<PrintHeader title={m.adminSupervisors()} globalSearchValue={filterValue ?? undefined} />

<TableSearch searchValue={filterValue} changeSearchValue={(v) => (filterValue = v)} />

<div class="mt-4 overflow-x-auto">
	<SvelteTable
		{columns}
		rows={supervisors}
		rowKey="id"
		classNameTable="table {getZebra() && 'table-zebra'} table-{getTableSize()} table-pin-rows"
		classNameRow="hover:!bg-base-300 cursor-pointer"
		on:clickRow={(e) => (supervisor = e.detail.row)}
		iconAsc="<i class='fa-duotone fa-arrow-down-a-z'></i>"
		iconDesc="<i class='fa-duotone fa-arrow-down-z-a'></i>"
		iconSortable="<i class='fa-solid fa-sort'></i>"
		sortBy="name"
	/>
</div>

<Drawer {supervisor} onClose={() => (supervisor = null)} {data} />
