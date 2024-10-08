<script lang="ts">
	import type { PageData } from './$types';
	import Header from '$lib/components/Header.svelte';
	import PreConferenceStage from './DelegationPreConferenceStage.svelte';
	import RegistrationStage from './DelegationRegistrationStage.svelte';
	import PostConferenceStage from './DelegationPostConferenceStage.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import Supervisor from './Supervisor.svelte';
	import { redirect } from '@sveltejs/kit';
	import SingleParticipantRegistrationStage from './SingleParticipantRegistrationStage.svelte';

	enum STAGE {
		REGISTRATION = 'REGISTRATION',
		POST_REGISTRATION = 'POST_REGISTRATION',
		PRE_CONFERENCE = 'PRE_CONFERENCE',
		POST_CONFERENCE = 'POST_CONFERENCE',
		ACTIVE = 'ACTIVE'
	}

	enum CATEGORY {
		INDIVIDUAL = 'INDIVIDUAL',
		DELEGATION = 'DELEGATION',
		SUPERVISOR = 'SUPERVISOR'
	}

	let { data }: { data: PageData } = $props();

	const conference = $derived(data?.conferences.find((x) => x.id === data.conferenceId));

	const determinStage: () => STAGE = () => {
		if (conference) {
			if (conference.status === 'POST') {
				return STAGE.POST_CONFERENCE;
			}
			if (conference.status === 'ACTIVE') {
				return STAGE.ACTIVE;
			}
			// conference.status is now implicitly 'PRE'
			// if () { // TODO logic to determaian if the person has been assigned a role yet
			// 	return 'PRE_CONFERENCE';
			// }
			return STAGE.REGISTRATION;
		}
		if (browser) {
			goto('/dashboard');
		} else {
			redirect(302, '/dashboard');
		}
		return STAGE.REGISTRATION;
	};

	const determineCategory = () => {
		if (data.supervisorData) {
			return CATEGORY.SUPERVISOR;
		}
		if (data.singleParticipantData) {
			return CATEGORY.INDIVIDUAL;
		}
		return CATEGORY.DELEGATION;
	};

	$effect(() => {
		if (conference === undefined) {
			goto('/no-conference');
		}
	});
</script>

<Header title={conference?.title ?? 'Unknown'} />
<div class="flex flex-col py-10 gap-10">
	{#if determineCategory() === 'INDIVIDUAL'}
		{#if determinStage() === 'REGISTRATION' || determinStage() === 'POST_REGISTRATION'}
			<SingleParticipantRegistrationStage {data} />
		{:else if determinStage() === 'PRE_CONFERENCE'}
			#TODO: Implement individual pre-conference stage
		{:else if determinStage() === 'POST_CONFERENCE'}
			#TODO: Implement individual post-conference stage
		{/if}
	{:else if determineCategory() === CATEGORY.DELEGATION}
		{#if determinStage() === STAGE.REGISTRATION}
			<RegistrationStage {data} />
		{:else if determinStage() === STAGE.PRE_CONFERENCE}
			<PreConferenceStage />
		{:else if determinStage() === STAGE.POST_CONFERENCE}
			<PostConferenceStage />
		{/if}
	{:else if determineCategory() === CATEGORY.SUPERVISOR}
		{#if determinStage() === STAGE.POST_CONFERENCE}
			#TODO: Implement supervisor post-conference stage
		{:else}
			<Supervisor {data} />
		{/if}
	{/if}
</div>
