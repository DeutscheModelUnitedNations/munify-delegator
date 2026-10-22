<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { closeUserCard } from './userCardState.svelte';
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
	import SupervisorTab from './tabs/SupervisorTab.svelte';
	import HistoryTab from './tabs/HistoryTab.svelte';
	import UserCardLoadError from './UserCardLoadError.svelte';

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
						fontAwesomeIcon
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
				supervisedDelegationMembers {
					id
					delegation {
						id
						assignedNation {
							alpha2Code
						}
						assignedNonStateActor {
							id
						}
					}
				}
				supervisedSingleParticipants {
					id
					assignedRole {
						id
					}
				}
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
				state
				startConference
				endConference
				title
				postalName
				postalStreet
				postalApartment
				postalZip
				postalCity
				postalCountry
			}
		}
	`);

	let loadFailed = $state(false);
	const refetchData = () => {
		loadFailed = false;
		mainQuery.fetch({ variables: { userId, conferenceId } }).catch(() => (loadFailed = true));
	};

	$effect(refetchData);

	// without these, a failed request or an unknown ID renders as a person with nothing set
	const failed = $derived(loadFailed || !!$mainQuery.errors?.length);
	const notFound = $derived(
		!failed && !$mainQuery.fetching && !!$mainQuery.data && !$mainQuery.data.findUniqueUser
	);

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

	const hasConferenceAccess = $derived.by(() => {
		if (isTeamMember) return true;
		if (
			isDelegationMember &&
			(delegationMember?.delegation.assignedNation ||
				delegationMember?.delegation.assignedNonStateActor)
		)
			return true;
		if (isSingleParticipant && singleParticipant?.assignedRole) return true;
		if (isConferenceSupervisor) {
			const sup = conferenceSupervisor;
			const anyDelegationAssigned = sup?.supervisedDelegationMembers?.some(
				(dm) => dm.delegation.assignedNation || dm.delegation.assignedNonStateActor
			);
			const anySingleAssigned = sup?.supervisedSingleParticipants?.some((sp) => sp.assignedRole);
			if (anyDelegationAssigned || anySingleAssigned) return true;
		}
		return false;
	});
</script>

{#if failed || notFound}
	<div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
		{#if failed}
			<i class="fa-duotone fa-cloud-exclamation text-error text-5xl"></i>
			<h2 class="text-xl font-bold">{m.httpGenericError()}</h2>
			<div class="max-w-md">
				<UserCardLoadError onretry={refetchData} />
			</div>
		{:else}
			<i class="fa-duotone fa-user-xmark text-5xl opacity-60"></i>
			<h2 class="text-xl font-bold">{m.userNotFound()}</h2>
			<p class="max-w-md opacity-70">
				{m.userCardNotFound({ id: userId })}
			</p>
		{/if}
	</div>
{:else}
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
			mediaConsentStatus={participantStatus?.mediaConsentStatus}
			loading={$mainQuery.fetching}
			{mode}
			onDelete={() => {
				closeUserCard();
				refetchData();
			}}
		/>

		<UserCardTabs
			{activeTab}
			onTabChange={(tab) => (activeTab = tab)}
			showStatus={hasConferenceAccess}
			showSurveys={hasConferenceAccess && !isTeamMember}
			showRole={isSingleParticipant || isTeamMember}
			showDelegation={isDelegationMember}
			showPapers={isDelegationMember}
			showSupervisors={isDelegationMember || isSingleParticipant}
			showSupervisor={isConferenceSupervisor}
		/>

		<div class="flex-1 overflow-y-auto p-5 md:px-10 md:py-6 lg:px-16" data-vaul-no-drag>
			{#if $mainQuery.fetching}
				<div class="flex flex-col gap-3">
					<div class="skeleton h-24 w-full"></div>
					<div class="skeleton h-24 w-full"></div>
				</div>
			{:else if activeTab === 'userData'}
				<UserDataTab {user} {userId} {conferenceId} {conference} onUpdate={refetchData} />
			{:else if activeTab === 'status'}
				<ParticipantStatusTab
					status={participantStatus}
					{userId}
					{conferenceId}
					{user}
					{conference}
					birthday={user?.birthday}
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
			{:else if activeTab === 'role' && (isSingleParticipant || isTeamMember)}
				<RoleTab {singleParticipant} {teamMember} conferenceState={conference?.state} />
			{:else if activeTab === 'delegation' && delegationMember}
				<DelegationTab
					delegationId={delegationMember.delegation.id}
					{conferenceId}
					{userId}
					conferenceState={conference?.state}
				/>
			{:else if activeTab === 'papers' && isDelegationMember}
				<PapersTab {userId} {conferenceId} />
			{:else if activeTab === 'supervisors' && (isDelegationMember || isSingleParticipant)}
				<SupervisorsTab {userId} {conferenceId} onUpdate={refetchData} />
			{:else if activeTab === 'supervisor' && conferenceSupervisor}
				<SupervisorTab {userId} {conferenceId} {conferenceSupervisor} onUpdate={refetchData} />
			{:else if activeTab === 'history'}
				<HistoryTab {userId} {conferenceId} />
			{/if}
		</div>
	</div>
{/if}
