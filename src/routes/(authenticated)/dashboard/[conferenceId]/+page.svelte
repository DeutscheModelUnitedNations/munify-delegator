<script lang="ts">
	import { getOptionalCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { ofAgeAtConference } from '#lib/helpers/ageChecker.js';
	import { fetchMyParticipation } from '#lib/api/myConferenceParticipation.js';
	import NoConferenceIndicator from '#lib/components/NoConferenceIndicator.svelte';
	import ParticipationStages from './stages/ParticipationStages.svelte';
	import SignInHint from '#lib/components/dashboard/SignInHint.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PublicQuickLinks from './sections/PublicQuickLinks.svelte';
	import ParticipantQuickLinks from './sections/ParticipantQuickLinks.svelte';
	import DashboardConferenceOverview from './sections/DashboardConferenceOverview.svelte';
	import type { PageProps } from './$types';
	import { client } from '#lib/api/rumbleClient/client.js';

	let { params }: PageProps = $props();

	// Only who the caller is here, and whether the conference exists; every section below fetches
	// what it shows itself.
	const [currentUser, participation, existing] = $derived(
		await Promise.all([
			getOptionalCurrentUser(),
			fetchMyParticipation(params.conferenceId),
			client.liveQuery.conferences({
				__args: { where: { id: { eq: params.conferenceId } } },
				id: true
			})
		])
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
	const conferenceId = $derived(params.conferenceId);

	const hasAssignedRole = $derived(
		!!singleParticipant?.assignedRole || !!delegationMember?.delegation.assignedRole
	);
</script>

<div class="flex w-full flex-col items-center">
	{#if existing.length === 0}
		<NoConferenceIndicator />
	{:else if !currentUser}
		<!-- A visitor who is not signed in sees the conference and what taking part would take -->
		<div class="flex w-full flex-col gap-10">
			<DashboardConferenceOverview {conferenceId} isTeamMember={false} hasAssignedRole={false}>
				{#snippet afterHeader()}
					<PublicQuickLinks {conferenceId} />
				{/snippet}
			</DashboardConferenceOverview>
			<SignInHint title={m.signInHintTitle()} text={m.signInToSeeYourParticipation()} />
		</div>
	{:else}
		<div class="flex w-full flex-col gap-10">
			{#if conference}
				<DashboardConferenceOverview
					{conferenceId}
					userId={currentUser.sub}
					isTeamMember={!!teamMember}
					{hasAssignedRole}
				>
					{#snippet afterHeader()}
						<ParticipantQuickLinks
							{conferenceId}
							{conference}
							{singleParticipant}
							{delegationMember}
							supervisorId={supervisor?.id}
							user={currentUser}
							{status}
							ofAge={isOfAgeAtConference}
						/>
					{/snippet}
				</DashboardConferenceOverview>
				<ParticipationStages
					{conferenceId}
					{conference}
					{singleParticipant}
					{delegationMember}
					supervisorId={supervisor?.id}
					isTeamMember={!!teamMember}
					user={currentUser}
					{status}
					ofAge={isOfAgeAtConference}
				/>
			{:else}
				<NoConferenceIndicator />
			{/if}
		</div>
	{/if}
</div>
