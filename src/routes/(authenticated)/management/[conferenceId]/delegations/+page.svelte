<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	// import PrintHeader from '$lib/components/dataTable/PrintHeader.svelte';
	import { type TableColumns } from 'svelte-table';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { getTableSettings } from '$lib/components/dataTable/dataTableSettings.svelte';
	import { appliedColumn } from '$lib/components/dataTable/commonColumns';
	import RegistrationAdminTable from '$lib/components/registrationAdmin/RegistrationAdminTable.svelte';
	import DelegationDrawer from './DelegationDrawer.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import codenmz from '$lib/helpers/codenamize';
	import type { PageProps } from './$types';
	import { assignedRoleName } from './delegationRole';

	let { params: routeParams }: PageProps = $props();

	// Only what the table's columns show and search; the drawer fetches the rest of a delegation.
	const fetchedDelegations = $derived(
		await client.liveQuery.delegations({
			__args: { where: { conferenceId: { eq: routeParams.conferenceId } } },
			id: true,
			entryCode: true,
			applied: true,
			school: true,
			assignedNation: { alpha2Code: true, alpha3Code: true },
			assignedNonStateActor: { id: true, name: true, fontAwesomeIcon: true },
			members: { id: true },
			appliedForRoles: { id: true }
		})
	);
	// The nation's translated name is only known client-side, so it is joined on here.
	const delegations = $derived(
		fetchedDelegations.map((d) => ({
			...d,
			assignedNation: d.assignedNation
				? {
						...d.assignedNation,
						name: getFullTranslatedCountryNameFromISO3Code(d.assignedNation.alpha3Code)
					}
				: undefined
		}))
	);

	const { getTableSize } = getTableSettings();

	const columns: TableColumns<(typeof delegations)[number]> = [
		{
			key: 'codename',
			title: 'Codename',
			value: (row) => codenmz(row.id)
		},
		{
			key: 'entryCode',
			title: 'Entry Code',
			value: (row) => row.entryCode,
			class: 'font-mono'
		},
		appliedColumn(getTableSize),
		{
			key: 'role',
			title: m.role(),
			parseHTML: true,
			value: assignedRoleName,
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
			key: 'appliedForRoles',
			title: m.roleApplications(),
			value: (row) => row.appliedForRoles.length,
			sortable: true,
			class: 'text-center'
		}
	];

	// TODO export data
</script>

<RegistrationAdminTable
	conferenceId={routeParams.conferenceId}
	{columns}
	rows={delegations}
	additionallyIndexedKeys={['assignedNation.name']}
	category={m.delegation()}
	pendingHeader={(selectedId) => ({ id: selectedId, title: codenmz(selectedId) })}
>
	{#snippet drawer(selectedId, close)}
		<DelegationDrawer
			delegationId={selectedId}
			conferenceId={routeParams.conferenceId}
			open
			onClose={close}
		/>
	{/snippet}
</RegistrationAdminTable>
