<script lang="ts">
	import BackToDashboard from '#lib/components/BackToDashboard.svelte';
	import { m } from '#lib/paraglide/messages';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import type { PageProps } from './$types';
	import { fetchMyParticipation } from '#lib/api/myConferenceParticipation';
	import { owesOwnFormalities } from '#lib/helpers/owesOwnFormalities';
	import PostalFlow from './PostalFlow.svelte';

	let { params }: PageProps = $props();

	const conferenceId = $derived(params.conferenceId);
	const [currentUser, participation] = $derived(
		await Promise.all([getCurrentUser(), fetchMyParticipation(conferenceId)])
	);
	// A supervisor who does not attend in person sends no documents of their own
	const owesDocuments = $derived(owesOwnFormalities(participation?.supervisor));
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
	<BackToDashboard {conferenceId} />
	<h1 class="text-2xl font-bold">{m.postalRegistration()}</h1>

	{#if owesDocuments}
		{#key conferenceId}
			<PostalFlow userId={currentUser.sub} {conferenceId} />
		{/key}
	{:else}
		<div role="status" class="alert alert-info alert-soft">
			<i aria-hidden="true" class="ph-duotone ph-info text-xl"></i>
			<span>{m.postalRegistrationNotNeededSupervisor()}</span>
		</div>
	{/if}
</div>
