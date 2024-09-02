<script lang="ts">
	import type { PageData } from './$types';
	import Header from '$lib/components/Header.svelte';
	import PreConferenceStage from './DelegationPreConferenceStage.svelte';
	import RegistrationStage from './DelegationRegistrationStage.svelte';
	import PostConferenceStage from './DelegationPostConferenceStage.svelte';
	import { invalidateAll } from '$app/navigation';

	enum STAGE {
		REGISTRATION = 'REGISTRATION',
		POST_REGISTRATION = 'POST_REGISTRATION',
		PRE_CONFERENCE = 'PRE_CONFERENCE',
		POST_CONFERENCE = 'POST_CONFERENCE',
		ACTIVE = 'ACTIVE'
	}

	let { data }: { data: PageData } = $props();

	let CATEGORY: 'INDIVIDUAL' | 'DELEGATION' | 'SUPERVISOR' = 'DELEGATION';

	const conference = $derived(data?.conferences.find((x) => x.id === data.conferenceId));

	const determinStage = () => {
		const now = new Date();
		if (conference) {
			if (conference.status === 'POST') {
				return 'POST_CONFERENCE';
			}
			if (conference.status === 'ACTIVE') {
				return 'ACTIVE';
			}
			// conference.status is now implicitly 'PRE'
			// if () { // TODO logic to determaian if the person has been assigned a role yet
			// 	return 'PRE_CONFERENCE';
			// }
			if (
				data.userData.delegationMemberships?.find((x) => x.conference.id === data.conferenceId)
					?.delegation.applied
			) {
				return 'POST_REGISTRATION';
			}
			return 'REGISTRATION';
		}
		throw new Error('Conference not found');
	};
</script>

<Header title={conference?.title ?? 'Unknown'} />
<div class="flex flex-col py-10 gap-10">
	{#if CATEGORY === 'INDIVIDUAL'}
		{#if determinStage() === 'REGISTRATION'}
			#TODO: Implement individual registration stage
		{:else if determinStage() === 'POST_REGISTRATION'}
			#TODO: Implement individual post-registration stage
		{:else if determinStage() === 'PRE_CONFERENCE'}
			#TODO: Implement individual pre-conference stage
		{:else if determinStage() === 'POST_CONFERENCE'}
			#TODO: Implement individual post-conference stage
		{/if}
	{:else if CATEGORY === 'DELEGATION'}
		{#if determinStage() === 'REGISTRATION'}
			<RegistrationStage {data} />
			<button onclick={() => invalidateAll()}>Invalidate</button>
		{:else if determinStage() === 'POST_REGISTRATION'}
			#TODO: Implement delegation post-registration stage
		{:else if determinStage() === 'PRE_CONFERENCE'}
			<PreConferenceStage />
		{:else if determinStage() === 'POST_CONFERENCE'}
			<PostConferenceStage />
		{/if}
	{:else if CATEGORY === 'SUPERVISOR'}
		{#if determinStage() === 'REGISTRATION'}
			#TODO: Implement supervisor registration stage
		{:else if determinStage() === 'POST_REGISTRATION'}
			#TODO: Implement supervisor post-registration stage
		{:else if determinStage() === 'PRE_CONFERENCE'}
			#TODO: Implement supervisor pre-conference stage
		{:else if determinStage() === 'POST_CONFERENCE'}
			#TODO: Implement supervisor post-conference stage
		{/if}
	{/if}
</div>
