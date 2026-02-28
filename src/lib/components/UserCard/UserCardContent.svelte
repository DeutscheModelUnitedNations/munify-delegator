<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import UserCardHeader from './UserCardHeader.svelte';
	import UserCardTabs from './UserCardTabs.svelte';
	import type { UserCardTab } from './UserCardTabs.svelte';
	import UserDataTab from './tabs/UserDataTab.svelte';
	import ParticipantStatusTab from './tabs/ParticipantStatusTab.svelte';
	import SurveyAnswersTab from './tabs/SurveyAnswersTab.svelte';
	import RoleTab from './tabs/RoleTab.svelte';
	import DelegationTab from './tabs/DelegationTab.svelte';
	import PapersTab from './tabs/PapersTab.svelte';
	import SupervisorsTab from './tabs/SupervisorsTab.svelte';
	import StudentsTab from './tabs/StudentsTab.svelte';
	import HistoryTab from './tabs/HistoryTab.svelte';

	interface Props {
		userId: string;
		conferenceId: string;
		mode: 'drawer' | 'page';
	}

	let { userId, conferenceId, mode }: Props = $props();

	let activeTab = $state<UserCardTab>('userData');

	const mainQuery = graphql(`
		query UserCardMainQuery($userId: String!, $conferenceId: String!) {
			findUniqueUser(where: { id: $userId }) {
				id
				given_name
				family_name
				pronouns
				phone
				email
				street
				apartment
				zip
				city
				country
				gender
				birthday
				foodPreference
				emergencyContacts
				globalNotes
				conferenceParticipationsCount
			}
			findManyDelegationMembers(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
				isHeadDelegate
				assignedCommittee {
					id
					abbreviation
					name
				}
				delegation {
					id
					school
					entryCode
					applied
					assignedNation {
						alpha2Code
						alpha3Code
					}
					assignedNonStateActor {
						id
						name
						abbreviation
					}
				}
			}
			findManySingleParticipants(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
				applied
				school
				motivation
				experience
				appliedForRoles {
					id
					name
					fontAwesomeIcon
				}
				assignedRole {
					id
					name
					fontAwesomeIcon
				}
			}
			findManyConferenceSupervisors(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
				plansOwnAttendenceAtConference
				connectionCode
			}
			findManyTeamMembers(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
				role
			}
			findManyConferenceParticipantStatuss(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
				paymentStatus
				termsAndConditions
				guardianConsent
				mediaConsent
				mediaConsentStatus
				didAttend
				assignedDocumentNumber
				accessCardId
				attendanceEntries {
					id
					timestamp
					occasion
					recordedBy {
						id
						given_name
						family_name
					}
				}
			}
			findManySurveyAnswers(
				where: {
					userId: { equals: $userId }
					question: { conferenceId: { equals: $conferenceId } }
				}
			) {
				id
				question {
					id
					title
				}
				option {
					id
					title
				}
			}
			findManySurveyQuestions(
				where: { conferenceId: { equals: $conferenceId }, hidden: { equals: false } }
			) {
				id
				title
				options {
					id
					title
					countSurveyAnswers
					upperLimit
				}
			}
			findUniqueConference(where: { id: $conferenceId }) {
				id
				startConference
				endConference
				title
			}
		}
	`);

	$effect(() => {
		mainQuery.fetch({ variables: { userId, conferenceId } });
	});

	const user = $derived($mainQuery.data?.findUniqueUser);
	const delegationMember = $derived($mainQuery.data?.findManyDelegationMembers?.[0]);
	const singleParticipant = $derived($mainQuery.data?.findManySingleParticipants?.[0]);
	const conferenceSupervisor = $derived($mainQuery.data?.findManyConferenceSupervisors?.[0]);
	const teamMember = $derived($mainQuery.data?.findManyTeamMembers?.[0]);
	const participantStatus = $derived($mainQuery.data?.findManyConferenceParticipantStatuss?.[0]);
	const surveyAnswers = $derived($mainQuery.data?.findManySurveyAnswers ?? []);
	const surveyQuestions = $derived($mainQuery.data?.findManySurveyQuestions ?? []);
	const conference = $derived($mainQuery.data?.findUniqueConference);

	const isDelegationMember = $derived(!!delegationMember);
	const isSingleParticipant = $derived(!!singleParticipant);
	const isConferenceSupervisor = $derived(!!conferenceSupervisor);
	const isTeamMember = $derived(!!teamMember);

	const refetchData = () => {
		mainQuery.fetch({ variables: { userId, conferenceId } });
	};
</script>

<div class="flex h-full flex-col">
	<UserCardHeader
		{userId}
		{conferenceId}
		givenName={user?.given_name}
		familyName={user?.family_name}
		pronouns={user?.pronouns}
		gender={user?.gender}
		{delegationMember}
		{singleParticipant}
		{conferenceSupervisor}
		{teamMember}
		loading={$mainQuery.fetching}
		{mode}
	/>

	<UserCardTabs
		{activeTab}
		onTabChange={(tab) => (activeTab = tab)}
		showDelegation={isDelegationMember}
		showPapers={isDelegationMember}
		showSupervisors={isDelegationMember || isSingleParticipant}
		showStudents={isConferenceSupervisor}
	/>

	<div class="flex-1 overflow-y-auto p-5 md:px-10 md:py-6 lg:px-16" data-vaul-no-drag>
		{#if $mainQuery.fetching}
			<div class="flex flex-col gap-3">
				<div class="skeleton h-24 w-full"></div>
				<div class="skeleton h-24 w-full"></div>
			</div>
		{:else if $mainQuery.errors}
			<div class="alert alert-error">
				<i class="fa-duotone fa-triangle-exclamation"></i>
				<span>{m.httpGenericError()}</span>
			</div>
		{:else if activeTab === 'userData'}
			<UserDataTab {user} {userId} {conferenceId} {conference} onUpdate={refetchData} />
		{:else if activeTab === 'status'}
			<ParticipantStatusTab
				status={participantStatus}
				{userId}
				{conferenceId}
				{conference}
				{user}
				{isDelegationMember}
				{isSingleParticipant}
				{isConferenceSupervisor}
				onUpdate={refetchData}
			/>
		{:else if activeTab === 'surveys'}
			<SurveyAnswersTab
				{surveyQuestions}
				{surveyAnswers}
				{conferenceId}
				{userId}
				onUpdate={refetchData}
			/>
		{:else if activeTab === 'role'}
			<RoleTab {delegationMember} {singleParticipant} {conferenceSupervisor} {teamMember} />
		{:else if activeTab === 'delegation' && delegationMember}
			<DelegationTab delegationId={delegationMember.delegation.id} {conferenceId} />
		{:else if activeTab === 'papers' && isDelegationMember}
			<PapersTab {userId} {conferenceId} />
		{:else if activeTab === 'supervisors' && (isDelegationMember || isSingleParticipant)}
			<SupervisorsTab {userId} {conferenceId} />
		{:else if activeTab === 'students' && isConferenceSupervisor}
			<StudentsTab {userId} {conferenceId} />
		{:else if activeTab === 'history'}
			<HistoryTab {userId} {conferenceId} />
		{/if}
	</div>
</div>
