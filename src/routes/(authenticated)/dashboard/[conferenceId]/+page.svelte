<script lang="ts">
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';
	import { fetchMyParticipation } from '$lib/api/myConferenceParticipation';
	import NoConferenceIndicator from '$lib/components/NoConferenceIndicator.svelte';
	import SingleParticipantRegistrationStage from './stages/SingleParticipant/SingleParticipantRegistrationStage.svelte';
	import SingleParticipantPreparationStage from './stages/SingleParticipant/SingleParticipantPreparationStage.svelte';
	import DelegationRegistrationStage from './stages/Delegation/DelegationRegistrationStage.svelte';
	import DelegationPreparationStage from './stages/Delegation/DelegationPreparationStage.svelte';
	import TeamMemberDashboard from './stages/TeamMember/TeamMemberDashboard.svelte';
	import Supervisor from './stages/Supervisor/Supervisor.svelte';
	import ParticipantStages from './stages/Common/ParticipantStages.svelte';
	import DashboardConferenceOverview from './sections/DashboardConferenceOverview.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Only who the caller is here; every section below fetches what it shows itself.
	const [currentUser, participation] = $derived(
		await Promise.all([getCurrentUser(), fetchMyParticipation(params.conferenceId)])
	);
	const isOfAgeAtConference = $derived(
		ofAgeAtConference(participation?.conference?.startConference, participation?.user?.birthday)
	);
	let conference = $derived(participation?.conference);
	let delegationMember = $derived(participation?.delegationMember);
	let singleParticipant = $derived(participation?.singleParticipant);
	let supervisor = $derived(participation?.supervisor);
	let teamMember = $derived(participation?.teamMember);
	let status = $derived(participation?.participantStatus ?? null);
	// Ids as primitives: a section keyed by one only fetches again when it changes, not on every live
	// update of the participation it was read from.
	const conferenceId = $derived(params.conferenceId);
	const singleParticipantId = $derived(singleParticipant?.id);
	const delegationMemberId = $derived(delegationMember?.id);
	const supervisorId = $derived(supervisor?.id);

	const delegationAccepted = $derived(
		!!delegationMember?.delegation.assignedNation ||
			!!delegationMember?.delegation.assignedNonStateActor
	);
	const hasAssignedRole = $derived(!!singleParticipant?.assignedRole || delegationAccepted);
</script>

<div class="flex w-full flex-col items-center">
	<div class="flex w-full flex-col gap-10">
		{#if conference}
			<DashboardConferenceOverview
				{conferenceId}
				userId={currentUser.sub}
				isTeamMember={!!teamMember}
				{hasAssignedRole}
			/>
		{/if}
		{#if !conference}
			<NoConferenceIndicator />
		{:else if singleParticipant && singleParticipantId}
			{#key singleParticipantId}
				<ParticipantStages
					{conferenceId}
					conferenceState={conference.state}
					userId={currentUser.sub}
					assignmentReleased={conference.assignmentReleased}
					accepted={!!singleParticipant.assignedRole}
					{status}
					ofAge={isOfAgeAtConference}
					certificateRole={{ customConferenceRole: singleParticipant.assignedRole }}
				>
					{#snippet registration()}
						<SingleParticipantRegistrationStage {conferenceId} {singleParticipantId} />
					{/snippet}
					{#snippet preparation()}
						<SingleParticipantPreparationStage
							{conferenceId}
							{singleParticipant}
							user={currentUser}
							{status}
							ofAgeAtConference={isOfAgeAtConference}
						/>
					{/snippet}
				</ParticipantStages>
			{/key}
		{:else if delegationMember && delegationMemberId}
			{#key delegationMemberId}
				<ParticipantStages
					{conferenceId}
					conferenceState={conference.state}
					userId={currentUser.sub}
					assignmentReleased={conference.assignmentReleased}
					accepted={delegationAccepted}
					{status}
					ofAge={isOfAgeAtConference}
					certificateRole={{
						country: delegationMember.delegation.assignedNation,
						nonStateActor: delegationMember.delegation.assignedNonStateActor,
						assignedCommittee: delegationMember.assignedCommittee
					}}
				>
					{#snippet registration()}
						<DelegationRegistrationStage {conferenceId} {delegationMemberId} />
					{/snippet}
					{#snippet preparation()}
						<DelegationPreparationStage
							{conferenceId}
							{delegationMember}
							user={currentUser}
							{status}
							ofAgeAtConference={isOfAgeAtConference}
						/>
					{/snippet}
				</ParticipantStages>
			{/key}
		{:else if supervisorId}
			{#key supervisorId}
				<Supervisor
					{conferenceId}
					conferenceState={conference.state}
					assignmentReleased={conference.assignmentReleased}
					{supervisorId}
					user={currentUser}
					{status}
					ofAge={isOfAgeAtConference}
				/>
			{/key}
		{:else if teamMember}
			<TeamMemberDashboard {conferenceId} role={teamMember.role} isAdmin={currentUser.isAdmin} />
		{:else if currentUser.isAdmin}
			<!-- A system admin needs no part in the conference to manage it -->
			<TeamMemberDashboard {conferenceId} isAdmin />
		{:else}
			<NoConferenceIndicator />
		{/if}
	</div>
</div>
