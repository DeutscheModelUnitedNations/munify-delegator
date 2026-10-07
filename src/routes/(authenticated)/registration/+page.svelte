<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import ConferenceCard from '$lib/components/conferenceCard/ConferenceCard.svelte';
	import { fetchOpenConferences } from './openConferences';
	import RegistrationEmptyState from './RegistrationEmptyState.svelte';
	import RegisteredConferenceNotice from './RegisteredConferenceNotice.svelte';

	const currentUser = $derived(await getCurrentUser());

	const open = $derived(await fetchOpenConferences(currentUser.sub));
	const conferences = $derived(open.conferences);

	/** Every conference the caller already has a registration in, in any of the three roles. */
	const registeredConferenceIds = $derived(
		new Set(
			[...open.singleParticipants, ...open.delegationMembers, ...open.conferenceSupervisors].map(
				(registration) => registration.conference.id
			)
		)
	);

	const registeredConferences = $derived(
		conferences.filter((conference) => registeredConferenceIds.has(conference.id))
	);
	const availableConferences = $derived(
		conferences.filter((conference) => !registeredConferenceIds.has(conference.id))
	);
</script>

<div class="@container mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-8">
	{#if conferences.length === 0}
		<RegistrationEmptyState />
	{:else}
		{#each registeredConferences as conference (conference.id)}
			<RegisteredConferenceNotice {conference} />
		{/each}

		<header class="flex flex-col gap-3">
			<span class="text-primary text-sm font-semibold tracking-widest uppercase">
				{m.registration()}
			</span>
			<h1 class="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
				{m.selectConference()}
			</h1>
		</header>

		{#if availableConferences.length > 0}
			<section class="flex flex-col gap-8">
				{#each availableConferences as conference (conference.id)}
					<ConferenceCard {conference} />
				{/each}
			</section>
		{/if}
	{/if}
</div>
