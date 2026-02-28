<script lang="ts">
	import UserDrawer from './UserDrawer.svelte';
	import { type TableColumns } from 'svelte-table';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import { capitalizeFirstLetter } from '$lib/services/capitalizeFirstLetter';
	import { getTableSettings } from '$lib/components/DataTable/dataTableSettings.svelte';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import type { ParticipationType, UserRowData } from './types';
	import { cache, query } from '$houdini';
	import { getAgeAtConference, ofAgeAtConference } from '$lib/services/ageChecker';
	import { queryParam } from 'sveltekit-search-params';
	import { openUserCard } from '$lib/components/UserCard/userCardState.svelte';

	const { data }: { data: PageData } = $props();
	const queryData = $derived(data.ConferenceParticipantsByParticipationTypeQuery);
	const conference = $derived($queryData.data?.findUniqueConference);
	const participationStatuses = $derived($queryData.data?.findManyConferenceParticipantStatuss);

	let selectedUserRow = queryParam('selected');

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
				status: getParticipationStatus(user.id),
				email: user.email,
				participationCount: user.conferenceParticipationsCount ?? 0
			});
		}
		for (const userRaw of $queryData.data?.findManyDelegationMembers ?? []) {
			const user = userRaw.user;
			ret.push({
				...user,
				participationType: 'DELEGATION_MEMBER',
				status: getParticipationStatus(user.id),
				email: user.email,
				participationCount: user.conferenceParticipationsCount ?? 0
			});
		}
		for (const userRaw of $queryData.data?.findManySingleParticipants ?? []) {
			const user = userRaw.user;
			ret.push({
				...user,
				participationType: 'SINGLE_PARTICIPANT',
				status: getParticipationStatus(user.id),
				email: user.email,
				participationCount: user.conferenceParticipationsCount ?? 0
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
			key: 'email',
			title: m.email(),
			value: (row) => row.email,
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
					? (getAgeAtConference(row.birthday, conference.startConference) ?? 'N/A')
					: 'N/A',
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'participationCount',
			title: m.participationCount(),
			value: (row) => row.participationCount.toString(),
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
		},
		{
			key: 'userCard',
			title: '',
			renderValue: (row) =>
				`<button class="btn btn-ghost btn-xs btn-square usercard-btn" data-userid="${row.id}" aria-label="Open user card"><i class="fa-duotone fa-id-card"></i></button>`,
			parseHTML: true,
			class: 'text-center w-10 print:hidden'
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

	// <!-- <ManagementHeader title={m.adminUsers()} exportedData={exportedData()} tableOptions /> -->
	// <PrintHeader title={m.adminUsers()} globalSearchValue={filterValue ?? undefined} />
	// <TableSearch searchValue={filterValue} changeSearchValue={(v) => (filterValue = v)} />
	// TODO export data
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	onclick={(e) => {
		const btn = e.target instanceof Element ? e.target.closest('.usercard-btn') : null;
		if (btn) {
			e.stopPropagation();
			const userId = btn.getAttribute('data-userid');
			if (userId) openUserCard(userId, data.conferenceId);
		}
	}}
>
	<DataTable
		{columns}
		rows={users}
		enableSearch={true}
		queryParamKey="filter"
		rowSelected={(row) => {
			$selectedUserRow = row.id;
		}}
	/>
</div>

{#if $selectedUserRow}
	<UserDrawer
		userId={$selectedUserRow}
		conferenceId={data.conferenceId}
		open={$selectedUserRow !== null}
		onClose={() => {
			$selectedUserRow = null;
			cache.markStale();
			data.ConferenceParticipantsByParticipationTypeQuery.fetch();
		}}
	/>
{/if}
