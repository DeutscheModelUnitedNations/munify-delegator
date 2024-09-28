<script lang="ts">
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	// import DataTableBody from '$lib/components/DataTable/DataTableBody.svelte';
	import DataTableHeader from '$lib/components/DataTable/DataTableHeader.svelte';
	import TableSearch from '$lib/components/DataTable/TableSearch.svelte';
	import TableSizeControl from '$lib/components/DataTable/TableSizeControl.svelte';
	import ZebraControl from '$lib/components/DataTable/ZebraControl.svelte';
	import ExportButtons from '$lib/components/DataTable/ExportButtons.svelte';
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import PrintHeader from '$lib/components/DataTable/PrintHeader.svelte';
	import UserDrawer from './UserDrawer.svelte';
	import SvelteTable, { type TableColumns, type TableColumn } from 'svelte-table';
	import type { User } from '@prisma/client';
	import * as m from '$lib/paraglide/messages';

	const { data } = $props();

	let participants = $state(data.participants);

	const columns: TableColumns<User> = [
		{
			key: 'family_name',
			title: m.familyName(),
			value: (row) => capitalize(row.family_name),
			sortable: true
		},
		{
			key: 'given_name',
			title: m.givenName(),
			value: (row) => capitalize(row.given_name),
			sortable: true
		},
		{
			key: 'birthday',
			title: m.conferenceAge(),
			value: (row) =>
				row.birthday && data.conferenceData.end
					? (calculateConferenceAge(new Date(row.birthday)) ?? 'N/A')
					: 'N/A',
			sortable: true
		},
		{
			key: 'city',
			title: m.city(),
			value: (row) => (row.city ? capitalize(row.city) : 'N/A'),
			sortable: true
		}
	];

	let tableSize = $state<'xs' | 'sm' | 'md' | 'lg'>('md');
	let zebra = $state(true);
	let filterValue = $state<string>(data.idQuery ?? '');

	$effect(() => {
		if (filterValue !== '') {
			participants = data.participants.filter((u) => {
				const search = filterValue!.toLowerCase();
				return (
					(u.family_name && u.family_name.toLowerCase().includes(search)) ||
					(u.given_name && u.given_name.toLowerCase().includes(search)) ||
					(u.city && u.city.toLowerCase().includes(search)) ||
					(u.id && u.id.toLowerCase().includes(search))
				);
			});
		} else {
			participants = data.participants;
		}
	});

	const calculateConferenceAge = (birthday: Date) => {
		if (!data.conferenceData.end) return undefined;
		const conferenceEnd = new Date(data.conferenceData.end);
		const age = conferenceEnd.getFullYear() - birthday.getFullYear();
		const m = conferenceEnd.getMonth() - birthday.getMonth();
		const d = conferenceEnd.getDate() - birthday.getDate();
		return (m < 0 || (m === 0 && d < 0) ? age - 1 : age).toString();
	};

	const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	const exportedData = $derived(() => {
		return [
			...participants.map((p) => ({
				family_name: p.family_name,
				given_name: p.given_name,
				conference_age: calculateConferenceAge(new Date(p.birthday)),
				city: p.city
			}))
		];
	});

	let drawerUser = $state<User | null>(null);
</script>

<ManagementHeader title={m.adminUsers()} />
<PrintHeader title={m.adminUsers()} globalSearchValue={filterValue ?? undefined} />

<section class="my-10 no-print">
	<div class="flex flex-wrap gap-4">
		<ExportButtons exportedData={exportedData()} />
		<TableSizeControl bind:tableSize />
		<ZebraControl bind:zebra />
	</div>
</section>

<TableSearch searchValue={filterValue} changeSearchValue={(v) => (filterValue = v)} />

<div class="mt-4 overflow-x-auto">
	<SvelteTable
		{columns}
		rows={participants}
		rowKey="id"
		classNameTable="table {zebra && 'table-zebra'} table-{tableSize} table-pin-rows"
		classNameRow="hover:!bg-base-300 cursor-pointer"
		on:clickRow={(e) => (drawerUser = e.detail.row)}
		iconAsc="<i class='fa-duotone fa-arrow-down-a-z'></i>"
		iconDesc="<i class='fa-duotone fa-arrow-down-z-a'></i>"
		iconSortable="<i class='fa-solid fa-sort'></i>"
		sortBy="family_name"
	/>
</div>

<UserDrawer user={drawerUser} onClose={() => (drawerUser = null)} {data} />
