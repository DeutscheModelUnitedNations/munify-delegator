<script lang="ts">
	import type { PageData } from './$houdini';
	import Supervisor from './stages/Supervisor.svelte';
	import SingleParticipantRegistrationStage from './stages/SingleParticipantRegistrationStage.svelte';
	import SingleParticipantPreparationStage from './stages/SingleParticipantPreparationStage.svelte';
	import DelegationRegistrationStage from './stages/DelegationRegistrationStage.svelte';
	import DelegationPreparationStage from './stages/DelegationPreparationStage.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import NoConferenceIndicator from '$lib/components/NoConferenceIndicator.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import ConferenceStatusWidget from './ConferenceStatusWidget.svelte';
	import ApplicationRejected from '$lib/components/ApplicationRejected.svelte';

	// the app needs some proper loading states!
	//TODO https://houdinigraphql.com/guides/loading-states

	let { data }: { data: PageData } = $props();
	let conferenceQuery = $derived(data.MyConferenceparticipationQuery);
	let conferenceQueryData = $derived($conferenceQuery.data);
	let conference = $derived(conferenceQueryData?.findUniqueConference);
</script>

<div class="flex w-full flex-col items-center">
	{#if $conferenceQuery.fetching}
		<Spinner />
	{:else}
		<div class="flex w-full flex-col gap-10">
			<!-- TODO add "new" badge if content of this changes -->
			{#if conferenceQueryData?.findUniqueSingleParticipant?.id}
				{#if conference!.state === 'PARTICIPANT_REGISTRATION'}
					<SingleParticipantRegistrationStage data={{ ...conferenceQueryData, user: data.user }} />
				{:else if conferenceQueryData?.findUniqueSingleParticipant?.assignedRole}
					{#if conference!.state === 'PREPARATION'}
						<ConferenceStatusWidget conferenceId={conference!.id} userId={data.user.sub} />
						<SingleParticipantPreparationStage data={{ ...conferenceQueryData, user: data.user }} />
					{:else if conference!.state === 'ACTIVE'}
						#TODO: Implement individual on conference stage
					{:else if conference!.state === 'POST'}
						#TODO: Implement individual post conference stage
					{/if}
				{:else}
					<ApplicationRejected />
				{/if}
			{:else if conferenceQueryData?.findUniqueDelegationMember?.id}
				{#if conference!.state === 'PARTICIPANT_REGISTRATION'}
					<DelegationRegistrationStage data={{ ...conferenceQueryData, user: data.user }} />
				{:else if !!conferenceQueryData?.findUniqueDelegationMember?.delegation?.assignedNation || !!conferenceQueryData?.findUniqueDelegationMember?.delegation?.assignedNonStateActor}
					{#if conference!.state === 'PREPARATION'}
						<ConferenceStatusWidget conferenceId={conference!.id} userId={data.user.sub} />
						<DelegationPreparationStage data={{ ...conferenceQueryData, user: data.user }} />
					{:else if Date.now() < conference!.startConference.getTime() && Date.now() < conference!.endConference.getTime()}
						#TODO: Implement individual on conference stage
					{:else if Date.now() > conference!.endConference.getTime()}
						<!-- <PostConferenceStage /> -->
					{/if}
				{:else}
					<ApplicationRejected />
				{/if}
			{:else if conferenceQueryData?.findUniqueConferenceSupervisor}
				{#if conference!.state === 'PARTICIPANT_REGISTRATION' || conferenceQueryData.findUniqueConferenceSupervisor.delegations.filter((x) => !!x.assignedNation || !!x.assignedNonStateActor).length > 0}
					<Supervisor data={{ ...conferenceQueryData, user: data.user }} />
				{:else}
					<ApplicationRejected />
				{/if}
			{:else}
				<NoConferenceIndicator />
			{/if}
		</div>
	{/if}
</div>
