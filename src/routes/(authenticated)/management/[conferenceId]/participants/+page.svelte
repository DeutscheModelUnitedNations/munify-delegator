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
	import { cache } from '$houdini';
	import { ofAgeAtConference } from '$lib/services/ageChecker';

	const { data }: { data: PageData } = $props();
	const queryData = $derived(data.ConferenceParticipantsByParticipationTypeQuery);
	const conference = $derived($queryData.data?.findUniqueConference);
	const participationStatuses = $derived($queryData.data?.findManyConferenceParticipantStatuss);

	const users = $derived.by(() => {
		const getParticipationStatus = (userId: string) => {
			if (!participationStatuses) return undefined;
			const status = participationStatuses.find((s) => s.user.id === userId);
			return status;
		};

		const ret: UserRowData[] = [];
		for (const userRaw of $queryData.data?.findManyConferenceSupervisors ?? []) {
			const user = userRaw.user;
			ret.push({
				...user,
				participationType: 'SUPERVISOR',
				status: getParticipationStatus(user.id)
			});
		}
		for (const userRaw of $queryData.data?.findManyDelegationMembers ?? []) {
			const user = userRaw.user;
			ret.push({
				...user,
				participationType: 'DELEGATION_MEMBER',
				status: getParticipationStatus(user.id)
			});
		}
		for (const userRaw of $queryData.data?.findManySingleParticipants ?? []) {
			const user = userRaw.user;
			ret.push({
				...user,
				participationType: 'SINGLE_PARTICIPANT',
				status: getParticipationStatus(user.id)
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
		if (!conference?.startConference) return undefined;
		const age = conference.startConference.getFullYear() - birthday.getFullYear();
		const m = conference.startConference.getMonth() - birthday.getMonth();
		const d = conference.startConference.getDate() - birthday.getDate();
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
			key: 'paymentStatus',
			title: m.payment(),
			value: (row) => row.status?.paymentStatus ?? 'PENDING',
			renderValue: (row) => {
				switch (row.status?.paymentStatus) {
					case 'DONE':
						return `<i class="fas fa-check text-success"></i>`;
					case 'PENDING':
						return `<i class="fas fa-hourglass-half text-warning"></i>`;
					case 'PROBLEM':
						return `<i class="fas fa-triangle-exclamation fa-beat text-red-500"></i>`;
					default:
						return `<i class="fas fa-hourglass-half text-warning"></i>`;
				}
			},
			parseHTML: true,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'postalRegistrationStatus',
			title: m.postalRegistration(),
			value: (row) => {
				if (
					row.status?.termsAndConditions === 'PROBLEM' ||
					row.status?.mediaConsent === 'PROBLEM' ||
					row.status?.guardianConsent === 'PROBLEM' ||
					row.status?.paymentStatus === 'PROBLEM'
				) {
					return 'PROBLEM';
				}
				if (
					row.status?.termsAndConditions === 'DONE' &&
					row.status?.mediaConsent === 'DONE' &&
					row.status?.paymentStatus === 'DONE'
				) {
					return 'DONE';
				}
				return 'PENDING';
			},
			renderValue: (row) => {
				if (
					row.status?.termsAndConditions === 'PROBLEM' ||
					row.status?.mediaConsent === 'PROBLEM' ||
					row.status?.guardianConsent === 'PROBLEM'
				) {
					return `<i class="fas fa-triangle-exclamation fa-beat text-red-500"></i>`;
				}
				if (
					row.status?.termsAndConditions === 'DONE' &&
					row.status?.mediaConsent === 'DONE' &&
					(row.status?.guardianConsent === 'DONE' ||
						ofAgeAtConference(conference?.startConference, row.birthday))
				) {
					return `<i class="fas fa-check text-success"></i>`;
				}
				return `<i class="fas fa-hourglass-half text-warning"></i>`;
			},
			parseHTML: true,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'didAttend',
			title: m.attendance(),
			value: (row) => (row.status?.didAttend ? 1 : 0),
			renderValue: (row) => {
				if (row.status?.didAttend) {
					return `<i class="fas fa-check text-success"></i>`;
				}
				return `<i class="fas fa-xmark text-error"></i>`;
			},
			parseHTML: true,
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
		onClose={() => {
			selectedUserRow = undefined;
			cache.markStale();
			data.ConferenceParticipantsByParticipationTypeQuery.fetch();
		}}
	/>
{/if}
