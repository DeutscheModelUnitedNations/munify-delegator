<script lang="ts">
	import type { PageData } from './$houdini';
	import PreConferenceStage from './DelegationPreConferenceStage.svelte';
	import RegistrationStage from './DelegationRegistrationStage.svelte';
	import PostConferenceStage from './DelegationPostConferenceStage.svelte';
	import Supervisor from './Supervisor.svelte';
	import SingleParticipantRegistrationStage from './SingleParticipantRegistrationStage.svelte';

	let { data }: { data: PageData } = $props();
	let conference = $derived(data.conference);
</script>

<div class="flex flex-col gap-10 py-10">
	{#if data.singleParticipant}
		{#if Date.now() > conference.startRegistration.getTime() && Date.now() < conference.startAssignment.getTime()}
			<SingleParticipantRegistrationStage {data} />
		{:else if Date.now() > conference.startAssignment.getTime() && Date.now() < conference.startConference.getTime()}
			#TODO: Implement individual assignment stage
		{:else if Date.now() < conference.startConference.getTime() && Date.now() < conference.endConference.getTime()}
			#TODO: Implement individual on conference stage
		{:else if Date.now() > conference.endConference.getTime()}
			#TODO: Implement individual post conference stage
		{/if}
	{:else if data.delegationMember}
		{#if Date.now() > conference.startRegistration.getTime() && Date.now() < conference.startAssignment.getTime()}
			<RegistrationStage {data} />
		{:else if Date.now() > conference.startAssignment.getTime() && Date.now() < conference.startConference.getTime()}
			<PreConferenceStage />
		{:else if Date.now() < conference.startConference.getTime() && Date.now() < conference.endConference.getTime()}
			#TODO: Implement individual on conference stage
		{:else if Date.now() > conference.endConference.getTime()}
			<PostConferenceStage />
		{/if}
	{:else if data.supervisor}
		{#if Date.now() > conference.endConference.getTime()}
			#TODO: Implement supervisor post-conference stage
		{:else}
			<Supervisor {data} />
		{/if}
	{/if}
</div>
