<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import svgempty from '$assets/undraw/empty_street.svg';
	import ConferenceCard from '$lib/components/conferenceCard/ConferenceCard.svelte';
	import { fetchOpenConferences } from './openConferences';

	let { data }: { data: PageData } = $props();

	const open = $derived(await fetchOpenConferences(data.user.sub));
	const conferences = $derived(open.conferences);

	/** Every conference the caller already has a registration in, in any of the three roles. */
	const registeredConferenceIds = $derived(
		new Set(
			[...open.singleParticipants, ...open.delegationMembers, ...open.conferenceSupervisors].map(
				(registration) => registration.conference.id
			)
		)
	);

	function alreadyRegistered(conferenceId: string) {
		return registeredConferenceIds.has(conferenceId);
	}
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h1 class="text-xl">{m.selectConference()}</h1>
	</hero>

	<main>
		{#if conferences.length === 0}
			<section class="flex w-full flex-col items-center gap-4">
				<img src={svgempty} alt="Empty" class="mb-10 w-1/2" />
				<h1 class="text-center text-3xl">{m.noConferenceOpenForRegistration()}</h1>
				<p class="max-ch-md text-center">{m.noConferenceOpenForRegistrationText()}</p>
				<div class="flex flex-col gap-4 md:flex-row-reverse">
					<a class="btn mt-10" href="/">{m.backToHome()}</a>
				</div>
			</section>
		{:else}
			<section
				class="flex flex-col flex-wrap items-center justify-center gap-8 md:flex-row md:items-stretch"
			>
				{#each conferences as conference}
					<ConferenceCard
						{conference}
						alreadyRegistered={alreadyRegistered(conference.id)}
						baseSlug="/registration"
					/>
				{/each}
			</section>
		{/if}
	</main>
</div>
