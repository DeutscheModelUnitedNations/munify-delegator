<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
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

	interface Props {
		userId: string;
		conferenceId: string;
		mode: 'drawer' | 'page';
	}

	let { userId, conferenceId, mode }: Props = $props();

	let activeTab = $state<UserCardTab>('userData');

	/** Everything the user card shows, across all of its tabs. */
	async function fetchUserCardData(userId: string, conferenceId: string) {
		const forUser = { conferenceId: { eq: conferenceId }, userId: { eq: userId } };

		const [
			user,
			delegationMembers,
			singleParticipants,
			conferenceSupervisors,
			teamMembers,
			participantStatuses,
			surveyAnswers,
			surveyQuestions,
			conference
		] = await Promise.all([
			client.query.user({
				__args: { id: userId },
				id: true,
				givenName: true,
				familyName: true,
				pronouns: true,
				phone: true,
				email: true,
				street: true,
				apartment: true,
				zip: true,
				city: true,
				country: true,
				gender: true,
				birthday: true,
				foodPreference: true,
				emergencyContacts: true,
				globalNotes: true,
				conferenceParticipationsCount: true
			}),
			client.query.delegationMembers({
				__args: { where: forUser },
				id: true,
				isHeadDelegate: true,
				assignedCommittee: { id: true, abbreviation: true, name: true },
				delegation: {
					id: true,
					school: true,
					entryCode: true,
					applied: true,
					assignedNation: { alpha2Code: true, alpha3Code: true },
					assignedNonStateActor: {
						id: true,
						name: true,
						abbreviation: true,
						fontAwesomeIcon: true
					}
				}
			}),
			client.query.singleParticipants({
				__args: { where: forUser },
				id: true,
				applied: true,
				school: true,
				motivation: true,
				experience: true,
				appliedForRoles: { id: true, name: true, fontAwesomeIcon: true },
				assignedRole: { id: true, name: true, fontAwesomeIcon: true }
			}),
			client.query.conferenceSupervisors({
				__args: { where: forUser },
				id: true,
				plansOwnAttendenceAtConference: true,
				connectionCode: true,
				supervisedDelegationMembers: {
					id: true,
					delegation: {
						id: true,
						assignedNation: { alpha2Code: true },
						assignedNonStateActor: { id: true }
					}
				},
				supervisedSingleParticipants: { id: true, assignedRole: { id: true } }
			}),
			client.query.teamMembers({ __args: { where: forUser }, id: true, role: true }),
			client.query.conferenceParticipantStatuses({
				__args: { where: forUser },
				id: true,
				paymentStatus: true,
				termsAndConditions: true,
				guardianConsent: true,
				mediaConsent: true,
				mediaConsentStatus: true,
				didAttend: true,
				assignedDocumentNumber: true,
				accessCardId: true,
				attendanceEntries: {
					id: true,
					timestamp: true,
					occasion: true,
					recordedBy: { id: true, givenName: true, familyName: true }
				}
			}),
			client.query.surveyAnswers({
				__args: {
					where: {
						userId: { eq: userId },
						question: { conferenceId: { eq: conferenceId } }
					}
				},
				id: true,
				question: { id: true, title: true },
				option: { id: true, title: true }
			}),
			client.query.surveyQuestions({
				__args: { where: { conferenceId: { eq: conferenceId }, hidden: { eq: false } } },
				id: true,
				title: true,
				options: { id: true, title: true, countSurveyAnswers: true, upperLimit: true }
			}),
			client.query.conference({
				__args: { id: conferenceId },
				id: true,
				state: true,
				startConference: true,
				endConference: true,
				title: true,
				postalName: true,
				postalStreet: true,
				postalApartment: true,
				postalZip: true,
				postalCity: true,
				postalCountry: true
			})
		]);

		return {
			user,
			delegationMembers,
			singleParticipants,
			conferenceSupervisors,
			teamMembers,
			participantStatuses,
			surveyAnswers,
			surveyQuestions,
			conference
		};
	}

	let cardData = $state<Awaited<ReturnType<typeof fetchUserCardData>>>();
	let cardLoading = $state(false);
	let cardFailed = $state(false);

	async function refetchData() {
		cardLoading = true;
		cardFailed = false;
		try {
			cardData = await fetchUserCardData(userId, conferenceId);
		} catch (error) {
			console.error('Failed to load user card data:', error);
			cardFailed = true;
		} finally {
			cardLoading = false;
		}
	}

	$effect(() => {
		// Referenced so the card reloads when it is pointed at someone else.
		void userId;
		void conferenceId;
		void refetchData();
	});

	const user = $derived(cardData?.user);
	const delegationMember = $derived(cardData?.delegationMembers?.[0]);
	const singleParticipant = $derived(cardData?.singleParticipants?.[0]);
	const conferenceSupervisor = $derived(cardData?.conferenceSupervisors?.[0]);
	const teamMember = $derived(cardData?.teamMembers?.[0]);
	const participantStatus = $derived(cardData?.participantStatuses?.[0]);
	const surveyAnswers = $derived(cardData?.surveyAnswers ?? []);
	const surveyQuestions = $derived(cardData?.surveyQuestions ?? []);
	const conference = $derived(cardData?.conference);

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

<div class="flex h-full flex-col">
	<UserCardHeader
		{userId}
		{conferenceId}
		givenName={user?.givenName}
		familyName={user?.familyName}
		pronouns={user?.pronouns}
		gender={user?.gender}
		{delegationMember}
		{singleParticipant}
		{conferenceSupervisor}
		{teamMember}
		mediaConsentStatus={participantStatus?.mediaConsentStatus}
		loading={cardLoading}
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
		{#if cardLoading}
			<div class="flex flex-col gap-3">
				<div class="skeleton h-24 w-full"></div>
				<div class="skeleton h-24 w-full"></div>
			</div>
		{:else if cardFailed}
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
