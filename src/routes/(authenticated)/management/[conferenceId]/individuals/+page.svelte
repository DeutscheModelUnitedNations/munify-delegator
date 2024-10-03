<script lang="ts">
	import TableSearch from '$lib/components/DataTable/TableSearch.svelte';
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import PrintHeader from '$lib/components/DataTable/PrintHeader.svelte';
	import Drawer from './IndividualsDrawer.svelte';
	import SvelteTable, { type TableColumns } from 'svelte-table';
	import type { SingleParticipant, User, CustomConferenceRole } from '@prisma/client';
	import * as m from '$lib/paraglide/messages';
	import { getTableSettings } from '$lib/components/DataTable/tableSettings.svelte';

	type SingleParticipantData = SingleParticipant & {
		user: Pick<User, 'id' | 'given_name' | 'family_name'>;
		appliedForRoles: CustomConferenceRole[];
	};

	const { data } = $props();

	let singleParticipants = $state<SingleParticipantData[]>(data.singleParticipants);

	const columns: TableColumns<SingleParticipantData> = [
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
			key: 'roles',
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
		}
	];

	const { getTableSize, getZebra } = getTableSettings();

	let filterValue = $state<string>(data.idQuery ?? '');

	$effect(() => {
		if (filterValue !== '') {
			singleParticipants = data.singleParticipants.filter((u) => {
				const search = filterValue!.toLowerCase();
				return (
					(u.school && u.school.toLowerCase().includes(search)) ||
					(u.motivation && u.motivation.toLowerCase().includes(search)) ||
					(u.experience && u.experience.toLowerCase().includes(search)) ||
					(u.id && u.id.toLowerCase().includes(search)) ||
					(u.user.given_name && u.user.given_name.toLowerCase().includes(search)) ||
					(u.user.family_name && u.user.family_name.toLowerCase().includes(search)) ||
					(u.appliedForRoles &&
						u.appliedForRoles.some((r) => r.name.toLowerCase().includes(search)))
				);
			});
		} else {
			singleParticipants = data.singleParticipants;
		}
	});

	const exportedData = $derived(() => {
		return [
			...singleParticipants.map((p) => ({
				name: `${p.user.family_name} ${p.user.given_name}`,
				applied: p.applied ? 'Yes' : 'No',
				roles: p.appliedForRoles.map((r) => r.name).join(', '),
				school: p.school ?? 'N/A',
				motivation: p.motivation ?? 'N/A',
				experience: p.experience ?? 'N/A'
			}))
		];
	});

	let drawerSingleParticipant = $state<SingleParticipantData | null>(
		data.idQuery ? (singleParticipants.find((u) => u.id === data.idQuery) ?? null) : null
	);
</script>

<ManagementHeader
	title={m.adminSingleParticipants()}
	exportedData={exportedData()}
	tableOptions
	logoutUrl={data.logoutUrl}
/>
<PrintHeader title={m.adminSingleParticipants()} globalSearchValue={filterValue ?? undefined} />

<TableSearch searchValue={filterValue} changeSearchValue={(v) => (filterValue = v)} />

<div class="mt-4 overflow-x-auto">
	<SvelteTable
		{columns}
		rows={singleParticipants}
		rowKey="id"
		classNameTable="table {getZebra() && 'table-zebra'} table-{getTableSize()} table-pin-rows"
		classNameRow="hover:!bg-base-300 cursor-pointer"
		on:clickRow={(e) => (drawerSingleParticipant = e.detail.row)}
		iconAsc="<i class='fa-duotone fa-arrow-down-a-z'></i>"
		iconDesc="<i class='fa-duotone fa-arrow-down-z-a'></i>"
		iconSortable="<i class='fa-solid fa-sort'></i>"
		sortBy="name"
	/>
</div>

<Drawer
	singleParticipant={drawerSingleParticipant}
	onClose={() => (drawerSingleParticipant = null)}
	{data}
/>
