<script lang="ts">
	import TableSearch from '$lib/components/DataTable/TableSearch.svelte';
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import PrintHeader from '$lib/components/DataTable/PrintHeader.svelte';
	import UserDrawer from './UserDrawer.svelte';
	import SvelteTable, { type TableColumns } from 'svelte-table';
	import * as m from '$lib/paraglide/messages';
	import { getTableSettings } from '$lib/components/DataTable/tableSettings.svelte';
	import type { UserData } from './+page';

	enum ParticipationType {
		SUPERVISOR = 0,
		SINGLE_PARTICIPANT = 1,
		DELEGATION_MEMBER = 2
	}

	const { data } = $props();

	let participants = $state<UserData[]>(data.participants);

	const getParticipationType = (u: UserData) => {
		if (u.conferenceSupervisor?.length > 0) return ParticipationType.SUPERVISOR;
		if (u.singleParticipant?.length > 0) return ParticipationType.SINGLE_PARTICIPANT;
		if (u.delegationMemberships?.length > 0) return ParticipationType.DELEGATION_MEMBER;
		throw new Error('User has no participation type');
	};

	const localizedParticipationType = (type: ParticipationType) => {
		switch (type) {
			case ParticipationType.SUPERVISOR:
				return m.supervisor();
			case ParticipationType.SINGLE_PARTICIPANT:
				return m.singleParticipant();
			case ParticipationType.DELEGATION_MEMBER:
				return m.delegationMember();
		}
	};

	const columns: TableColumns<UserData> = [
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
			key: 'participationType',
			title: m.participationType(),
			value: (row) => localizedParticipationType(getParticipationType(row)),
			renderValue: (row) => {
				switch (getParticipationType(row)) {
					case ParticipationType.SUPERVISOR:
						return `<i class="fa-duotone fa-chalkboard-user text-${getTableSize()}"></i>`;
					case ParticipationType.SINGLE_PARTICIPANT:
						return `<i class="fa-duotone fa-user text-${getTableSize()}"></i>`;
					case ParticipationType.DELEGATION_MEMBER:
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
				row.birthday && data.conferenceData.end
					? (calculateConferenceAge(new Date(row.birthday)) ?? 'N/A')
					: 'N/A',
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'city',
			title: m.city(),
			value: (row) => (row.city ? capitalize(row.city) : 'N/A'),
			sortable: true
		}
	];

	const { getTableSize, getZebra } = getTableSettings();

	let filterValue = $state<string>(data.idQuery ?? '');

	$effect(() => {
		if (filterValue !== '') {
			participants = data.participants.filter((u) => {
				const search = filterValue!.toLowerCase();
				return (
					(u.family_name && u.family_name.toLowerCase().includes(search)) ||
					(u.given_name && u.given_name.toLowerCase().includes(search)) ||
					(u.city && u.city.toLowerCase().includes(search)) ||
					(u.id && u.id.toLowerCase().includes(search.toLowerCase()))
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
				participationType: localizedParticipationType(getParticipationType(p)),
				conference_age:
					(p.birthday && calculateConferenceAge(new Date(p.birthday))?.toString()) ?? 'N/A',
				city: p.city ?? 'N/A'
			}))
		];
	});

	let drawerUser = $state<UserData | null>(
		data.idQuery ? participants.find((p) => p.id === data.idQuery) : null
	);
</script>

<ManagementHeader title={m.adminUsers()} exportedData={exportedData()} tableOptions logoutUrl={data.logoutUrl} />
<PrintHeader title={m.adminUsers()} globalSearchValue={filterValue ?? undefined} />

<TableSearch searchValue={filterValue} changeSearchValue={(v) => (filterValue = v)} />

<div class="mt-4 overflow-x-auto">
	<SvelteTable
		{columns}
		rows={participants}
		rowKey="id"
		classNameTable="table {getZebra() && 'table-zebra'} table-{getTableSize()} table-pin-rows"
		classNameRow="hover:!bg-base-300 cursor-pointer"
		on:clickRow={(e) => (drawerUser = e.detail.row)}
		iconAsc="<i class='fa-duotone fa-arrow-down-a-z'></i>"
		iconDesc="<i class='fa-duotone fa-arrow-down-z-a'></i>"
		iconSortable="<i class='fa-solid fa-sort'></i>"
		sortBy="family_name"
	/>
</div>

<UserDrawer user={drawerUser} onClose={() => (drawerUser = null)} {data} />
