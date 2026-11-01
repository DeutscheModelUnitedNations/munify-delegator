<script lang="ts">
	import type { MyConferenceParticipation } from '#lib/api/myConferenceParticipation';
	import type { CurrentUser } from '#lib/state/currentUser.svelte.js';
	import { watchSelectionInProgress } from './selectionInProgress.svelte';
	import RegistrationLanding from '../../../registration/[conferenceId]/RegistrationLanding.svelte';
	import DelegationStages from './Delegation/DelegationStages.svelte';
	import SingleParticipantStages from './SingleParticipant/SingleParticipantStages.svelte';
	import Supervisor from './Supervisor/Supervisor.svelte';
	import TeamMemberDashboard from './TeamMember/TeamMemberDashboard.svelte';

	/** What the signed-in caller sees of a conference, by the part they have in it. */
	interface Props {
		conferenceId: string;
		conference: NonNullable<MyConferenceParticipation['conference']>;
		singleParticipant: MyConferenceParticipation['singleParticipant'] | undefined;
		delegationMember: MyConferenceParticipation['delegationMember'] | undefined;
		supervisorId: string | undefined;
		isTeamMember: boolean;
		user: CurrentUser;
		status: MyConferenceParticipation['participantStatus'] | null;
		ofAge: boolean;
	}

	let {
		conferenceId,
		conference,
		singleParticipant,
		delegationMember,
		supervisorId,
		isTeamMember,
		user,
		status,
		ofAge
	}: Props = $props();

	// Ids as primitives: a section keyed by one only fetches again when it changes, not on every live
	// update of the participation it was read from.
	const singleParticipantId = $derived(singleParticipant?.id);
	const delegationMemberId = $derived(delegationMember?.id);

	const conferenceState = $derived(conference.state);
	const applicationDeadline = $derived(conference.applicationDeadline);
	const gracePeriodMinutes = $derived(conference.registrationDeadlineGracePeriodMinutes);
	const selection = watchSelectionInProgress(() => ({
		state: conferenceState,
		applicationDeadline,
		registrationDeadlineGracePeriodMinutes: gracePeriodMinutes
	}));
</script>

{#if singleParticipant && singleParticipantId}
	{#key singleParticipantId}
		<SingleParticipantStages
			{conferenceId}
			{conference}
			{singleParticipant}
			{user}
			{status}
			{ofAge}
			selectionInProgress={selection.current}
		/>
	{/key}
{:else if delegationMember && delegationMemberId}
	{#key delegationMemberId}
		<DelegationStages
			{conferenceId}
			{conference}
			{delegationMember}
			{user}
			{status}
			{ofAge}
			selectionInProgress={selection.current}
		/>
	{/key}
{:else if supervisorId}
	{#key supervisorId}
		<Supervisor
			{conferenceId}
			conferenceState={conference.state}
			assignmentReleased={conference.assignmentReleased}
			selectionInProgress={selection.current}
			{supervisorId}
			{user}
			{status}
			{ofAge}
		/>
	{/key}
{:else if isTeamMember || user.isAdmin}
	<!-- A system admin needs no part in the conference to manage it -->
	<TeamMemberDashboard {conferenceId} />
{:else}
	<!-- No part in this conference yet: the only thing to do is to apply -->
	<RegistrationLanding {conferenceId} />
{/if}
