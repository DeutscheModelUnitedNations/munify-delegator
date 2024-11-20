<script lang="ts">
	import type { PageData } from './$houdini';
	import Supervisor from './stages/Supervisor.svelte';
	import SingleParticipantRegistrationStage from './stages/SingleParticipantRegistrationStage.svelte';
	import DelegationRegistrationStage from './stages/DelegationRegistrationStage.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import NoConferenceIndicator from '$lib/components/NoConferenceIndicator.svelte';
	import { invalidateAll } from '$app/navigation';

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
		<div class="flex flex-col gap-10">
			{#if conferenceQueryData?.findUniqueSingleParticipant}
				{#if Date.now() > conference!.startRegistration.getTime() && Date.now() < conference!.startAssignment.getTime()}
					<SingleParticipantRegistrationStage data={{ ...conferenceQueryData, user: data.user }} />
				{:else if Date.now() > conference!.startAssignment.getTime() && Date.now() < conference!.startConference.getTime()}
					#TODO: Implement individual assignment stage
				{:else if Date.now() < conference!.startConference.getTime() && Date.now() < conference!.endConference.getTime()}
					#TODO: Implement individual on conference stage
				{:else if Date.now() > conference!.endConference.getTime()}
					#TODO: Implement individual post conference stage
				{/if}
			{:else if conferenceQueryData?.findUniqueDelegationMember}
				{#if Date.now() > conference!.startRegistration.getTime() && Date.now() < conference!.startAssignment.getTime()}
					<DelegationRegistrationStage data={{ ...conferenceQueryData, user: data.user }} />
				{:else if Date.now() > conference!.startAssignment.getTime() && Date.now() < conference!.startConference.getTime()}
					<!-- <PreConferenceStage /> -->
				{:else if Date.now() < conference!.startConference.getTime() && Date.now() < conference!.endConference.getTime()}
					#TODO: Implement individual on conference stage
				{:else if Date.now() > conference!.endConference.getTime()}
					<!-- <PostConferenceStage /> -->
				{/if}
			{:else if conferenceQueryData?.findUniqueConferenceSupervisor}
				<Supervisor data={{ ...conferenceQueryData, user: data.user }} />
				<!-- {#if Date.now() > conference.endConference.getTime()}
		#TODO: Implement supervisor post-conference stage
		{:else}
		{/if} -->
			{:else}
				<NoConferenceIndicator />
			{/if}
		</div>
	{/if}
</div>
