<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	// import PrintHeader from '$lib/components/dataTable/PrintHeader.svelte';
	import { type TableColumns } from 'svelte-table';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { getTableSettings } from '$lib/components/dataTable/dataTableSettings.svelte';
	import {
		appliedColumn,
		nameColumn,
		userCardColumn
	} from '$lib/components/dataTable/commonColumns';
	import RegistrationAdminTable from '$lib/components/registrationAdmin/RegistrationAdminTable.svelte';
	import IndividualDrawer from './IndividualDrawer.svelte';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const singleParticipants = $derived(
		await client.liveQuery.singleParticipants({
			__args: { where: { conferenceId: { eq: routeParams.conferenceId } } },
			id: true,
			applied: true,
			school: true,
			appliedForRoles: { id: true, fontAwesomeIcon: true, name: true },
			assignedRole: { id: true, fontAwesomeIcon: true, name: true },
			motivation: true,
			experience: true,
			user: { id: true, familyName: true, givenName: true }
		})
	);
	const { getTableSize } = getTableSettings();

	const columns: TableColumns<(typeof singleParticipants)[number]> = [
		nameColumn(),
		appliedColumn(getTableSize),
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
					.join('')}</div>`;
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
		userCardColumn()
	];

	// TODO export data
</script>

<RegistrationAdminTable
	conferenceId={routeParams.conferenceId}
	{columns}
	rows={singleParticipants}
	category={m.singleParticipant()}
>
	{#snippet drawer(selectedId, close)}
		<IndividualDrawer
			singleParticipantId={selectedId}
			conferenceId={routeParams.conferenceId}
			open
			onClose={close}
		/>
	{/snippet}
</RegistrationAdminTable>
