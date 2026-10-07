<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { fetchUserCardRoles, hasConferenceAccess } from './userCardRoles';
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
		activeTab: UserCardTab;
	}

	let { userId, conferenceId, mode, activeTab = $bindable() }: Props = $props();

	const roles = $derived(await fetchUserCardRoles(userId, conferenceId));

	const user = $derived(roles.user);
	const delegationMember = $derived(roles.delegationMembers.at(0));
	const singleParticipant = $derived(roles.singleParticipants.at(0));
	const conferenceSupervisor = $derived(roles.conferenceSupervisors.at(0));
	const teamMember = $derived(roles.teamMembers.at(0));

	const showStatus = $derived(
		hasConferenceAccess({ delegationMember, singleParticipant, conferenceSupervisor, teamMember })
	);
	const showRole = $derived(!!singleParticipant || !!teamMember);
	const showSupervisors = $derived(!!delegationMember || !!singleParticipant);
	const delegationId = $derived(delegationMember?.delegation.id);
	const supervisorId = $derived(conferenceSupervisor?.id);
</script>

{#snippet tabContent(tab: UserCardTab)}
	{#if tab === 'userData'}
		<UserDataTab {userId} />
	{:else if tab === 'status'}
		<ParticipantStatusTab {userId} {conferenceId} isConferenceSupervisor={!!conferenceSupervisor} />
	{:else if tab === 'surveys'}
		<SurveyAnswersTab {conferenceId} {userId} />
	{:else if tab === 'role' && showRole}
		<RoleTab {userId} {conferenceId} />
	{:else if tab === 'delegation' && delegationId}
		<DelegationTab {delegationId} {conferenceId} {userId} />
	{:else if tab === 'papers' && delegationId}
		<PapersTab {userId} {conferenceId} />
	{:else if tab === 'supervisors' && showSupervisors}
		<SupervisorsTab {userId} {conferenceId} />
	{:else if tab === 'supervisor' && supervisorId}
		<SupervisorTab {supervisorId} />
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
	/>

	<UserCardTabs
		{activeTab}
		onTabChange={(tab) => (activeTab = tab)}
		{showStatus}
		showSurveys={showStatus && !teamMember}
		{showRole}
		showDelegation={!!delegationMember}
		showPapers={!!delegationMember}
		{showSupervisors}
		showSupervisor={!!conferenceSupervisor}
	/>

	<div class="flex-1 overflow-y-auto p-5 md:px-10 md:py-6 lg:px-16" data-vaul-no-drag>
		<!-- Keyed so every tab fetches what it shows when it is opened, behind its own skeleton. -->
		{#key activeTab}
			<svelte:boundary onerror={(error) => console.error('Failed to load user card tab:', error)}>
				{@render tabContent(activeTab)}

				{#snippet pending()}
					<div class="flex flex-col gap-3">
						<div class="skeleton h-24 w-full"></div>
						<div class="skeleton h-24 w-full"></div>
					</div>
				{/snippet}

				{#snippet failed()}
					<div class="alert alert-error">
						<i class="fa-duotone fa-triangle-exclamation"></i>
						<span>{m.httpGenericError()}</span>
					</div>
				{/snippet}
			</svelte:boundary>
		{/key}
	</div>
</div>
