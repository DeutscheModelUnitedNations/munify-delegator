<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { fetchUserCardRoles, hasConferenceAccess, participationStage } from './userCardRoles';
	import UserCardHeader from './UserCardHeader.svelte';
	import UserCardTabs from './UserCardTabs.svelte';
	import { shownUserCardTab, visibleUserCardTabs, type UserCardTab } from './userCardTabs';
	import PersonTab from './tabs/PersonTab.svelte';
	import RegistrationTab from './tabs/RegistrationTab.svelte';
	import SeatTab from './tabs/SeatTab.svelte';
	import FormalitiesTab from './tabs/FormalitiesTab.svelte';
	import ConferenceTab from './tabs/ConferenceTab.svelte';
	import SurveyAnswersTab from './tabs/SurveyAnswersTab.svelte';
	import PapersTab from './tabs/PapersTab.svelte';
	import HistoryTab from './tabs/HistoryTab.svelte';

	interface Props {
		userId: string;
		conferenceId: string;
		mode: 'drawer' | 'page';
		/** The tab picked last, which may not exist for this person */
		activeTab: UserCardTab | null;
	}

	let { userId, conferenceId, mode, activeTab = $bindable() }: Props = $props();

	const roles = $derived(await fetchUserCardRoles(userId, conferenceId));

	const user = $derived(roles.user);
	const delegationMember = $derived(roles.delegationMembers.at(0));
	const singleParticipant = $derived(roles.singleParticipants.at(0));
	const conferenceSupervisor = $derived(roles.conferenceSupervisors.at(0));
	const teamMember = $derived(roles.teamMembers.at(0));
	const participant = $derived(roles.participants.at(0));
	const waitingListEntry = $derived(roles.waitingListEntries.at(0));
	const conferenceState = $derived(roles.conference.state);

	const access = $derived(
		hasConferenceAccess({ delegationMember, singleParticipant, conferenceSupervisor, teamMember })
	);
	const registered = $derived(!!delegationMember || !!singleParticipant || !!conferenceSupervisor);
	// Opened from a search or a link for somebody who has no part in this conference at all
	const inConference = $derived(registered || !!teamMember || !!waitingListEntry);

	const stage = $derived(
		participationStage({
			application: delegationMember?.delegation ?? singleParticipant,
			waitingListEntry,
			didAttend: participant?.didAttend,
			conferenceState
		})
	);

	const tabs = $derived(
		visibleUserCardTabs({
			registered,
			waiting: !!waitingListEntry,
			holdsPart: registered || !!teamMember,
			participant: !!participant,
			access,
			team: !!teamMember,
			delegate: !!delegationMember
		})
	);
	const shownTab = $derived(shownUserCardTab(activeTab, tabs, conferenceState));

	const delegationId = $derived(delegationMember?.delegation.id);
	const singleParticipantId = $derived(singleParticipant?.id);
	const supervisorId = $derived(conferenceSupervisor?.id);
	const teamRole = $derived(teamMember?.role);
</script>

{#snippet tabContent(tab: UserCardTab)}
	{#if tab === 'person'}
		<PersonTab {userId} {conferenceId} />
	{:else if tab === 'registration'}
		<RegistrationTab {userId} {conferenceId} {delegationId} {singleParticipantId} {supervisorId} />
	{:else if tab === 'seat'}
		<SeatTab
			{userId}
			{conferenceId}
			{delegationId}
			{singleParticipantId}
			{supervisorId}
			{teamRole}
		/>
	{:else if tab === 'formalities'}
		<FormalitiesTab {userId} {conferenceId} isConferenceSupervisor={!!conferenceSupervisor} />
	{:else if tab === 'conference'}
		<ConferenceTab {userId} {conferenceId} />
	{:else if tab === 'surveys'}
		<SurveyAnswersTab {conferenceId} {userId} />
	{:else if tab === 'papers'}
		<PapersTab {userId} {conferenceId} />
	{:else if tab === 'history'}
		<HistoryTab {userId} {conferenceId} />
	{/if}
{/snippet}

<div class="flex h-full flex-col">
	<UserCardHeader
		{userId}
		{conferenceId}
		givenName={user.givenName}
		familyName={user.familyName}
		pronouns={user.pronouns}
		gender={user.gender}
		{delegationMember}
		{singleParticipant}
		{conferenceSupervisor}
		{teamMember}
		{mode}
		{stage}
		onOpenTab={(tab) => {
			if (tabs.includes(tab)) activeTab = tab;
		}}
	/>

	{#if !inConference}
		<div class="alert alert-warning mx-5 md:mx-10 lg:mx-16" role="status">
			<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
			<span>{m.notInConference()}</span>
		</div>
	{/if}

	<UserCardTabs {tabs} activeTab={shownTab} onTabChange={(tab) => (activeTab = tab)} />

	<div class="flex-1 overflow-y-auto p-5 md:px-10 md:py-6 lg:px-16" data-vaul-no-drag>
		<!-- Keyed so every tab fetches what it shows when it is opened, behind its own skeleton. -->
		{#key shownTab}
			<svelte:boundary onerror={(error) => console.error('Failed to load user card tab:', error)}>
				{@render tabContent(shownTab)}

				{#snippet pending()}
					<div class="flex flex-col gap-3">
						<div class="skeleton h-24 w-full"></div>
						<div class="skeleton h-24 w-full"></div>
					</div>
				{/snippet}

				{#snippet failed()}
					<div class="alert alert-error">
						<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
						<span>{m.httpGenericError()}</span>
					</div>
				{/snippet}
			</svelte:boundary>
		{/key}
	</div>
</div>
