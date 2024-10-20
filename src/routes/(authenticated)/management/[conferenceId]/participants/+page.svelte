<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	// import PrintHeader from '$lib/components/DataTable/PrintHeader.svelte';
	import UserDrawer from './UserDrawer.svelte';
	import { type TableColumns } from 'svelte-table';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import { capitalizeFirstLetter } from '$lib/services/capitalizeFirstLetter';
	import { getTableSettings } from '$lib/components/DataTable/dataTableSettings.svelte';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import type { ParticipationType, UserRowData } from './types';

	const { data }: { data: PageData } = $props();
	const queryData = $derived(data.ConferenceParticipantsByParticipationTypeQuery);
	const conference = $derived($queryData.data?.findUniqueConference);
	const users = $derived.by(() => {
		const ret: UserRowData[] = [];
		for (const userRaw of $queryData.data?.findManyConferenceSupervisors ?? []) {
			const user = userRaw.user;
			ret.push({
				...user,
				participationType: 'SUPERVISOR'
			});
		}
		for (const userRaw of $queryData.data?.findManyDelegationMembers ?? []) {
			const user = userRaw.user;
			ret.push({
				...user,
				participationType: 'DELEGATION_MEMBER'
			});
		}
		for (const userRaw of $queryData.data?.findManySingleParticipants ?? []) {
			const user = userRaw.user;
			ret.push({
				...user,
				participationType: 'SINGLE_PARTICIPANT'
			});
		}
		return ret;
	});

	const localizedParticipationType = (type: ParticipationType) => {
		switch (type) {
			case 'SUPERVISOR':
				return m.supervisor();
			case 'SINGLE_PARTICIPANT':
				return m.singleParticipant();
			case 'DELEGATION_MEMBER':
				return m.delegationMember();
		}
	};

	const calculateConferenceAge = (birthday: Date) => {
		if (!conference?.endConference) return undefined;
		const age = conference.endConference.getFullYear() - birthday.getFullYear();
		const m = conference.endConference.getMonth() - birthday.getMonth();
		const d = conference.endConference.getDate() - birthday.getDate();
		return (m < 0 || (m === 0 && d < 0) ? age - 1 : age).toString();
	};

	const { getTableSize } = getTableSettings();

	const columns: TableColumns<UserRowData> = [
		{
			key: 'family_name',
			title: m.familyName(),
			value: (row) => capitalizeFirstLetter(row.family_name),
			sortable: true
		},
		{
			key: 'given_name',
			title: m.givenName(),
			value: (row) => capitalizeFirstLetter(row.given_name),
			sortable: true
		},
		{
			key: 'participationType',
			title: m.participationType(),
			value: (row) => localizedParticipationType(row.participationType),
			renderValue: (row) => {
				switch (row.participationType) {
					case 'SUPERVISOR':
						return `<i class="fa-duotone fa-chalkboard-user text-${getTableSize()}"></i>`;
					case 'SINGLE_PARTICIPANT':
						return `<i class="fa-duotone fa-user text-${getTableSize()}"></i>`;
					case 'DELEGATION_MEMBER':
						return `<i class="fa-duotone fa-users-viewfinder text-${getTableSize()}"></i>`;
					default:
						return 'Error';
				}
			},
			parseHTML: true,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'birthday',
			title: m.conferenceAge(),
			value: (row) =>
				row.birthday && conference?.endConference
					? (calculateConferenceAge(row.birthday) ?? 'N/A')
					: 'N/A',
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'city',
			title: m.city(),
			value: (row) => (row.city ? capitalizeFirstLetter(row.city) : 'N/A'),
			sortable: true
		}
	];

	// const { getTableSize, getZebra } = getTableSettings();

	// let filterValue = $state<string>(data.idQuery ?? '');

	// const exportedData = $derived(() => {
	// 	return [
	// 		...participants.map((p) => ({
	// 			family_name: p.family_name,
	// 			given_name: p.given_name,
	// 			participationType: localizedParticipationType(getParticipationType(p)),
	// 			conference_age:
	// 				(p.birthday && calculateConferenceAge(new Date(p.birthday))?.toString()) ?? 'N/A',
	// 			city: p.city ?? 'N/A'
	// 		}))
	// 	];
	// });

	let selectedUserRow = $state<UserRowData>();

	// <!-- <ManagementHeader title={m.adminUsers()} exportedData={exportedData()} tableOptions /> -->
	// <PrintHeader title={m.adminUsers()} globalSearchValue={filterValue ?? undefined} />
	// <TableSearch searchValue={filterValue} changeSearchValue={(v) => (filterValue = v)} />
	// TODO export data
</script>

<DataTable
	{columns}
	rows={users}
	enableSearch={true}
	queryParamKey="filter"
	rowSelected={(row) => {
		selectedUserRow = row;
	}}
/>

{#if selectedUserRow}
	<UserDrawer
		user={selectedUserRow}
		conferenceId={data.conferenceId}
		open={selectedUserRow !== undefined}
		onClose={() => (selectedUserRow = undefined)}
	/>
{/if}
