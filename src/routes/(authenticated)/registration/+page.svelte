<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$houdini';
	import svgempty from '$assets/undraw/empty_street.svg';
	import ConferenceCard from '$lib/components/ConferenceCard/ConferenceCard.svelte';

	let { data }: { data: PageData } = $props();
	let conferenceQuery = $derived(data.ConferenceOpenForRegistrationQuery);
	let conferences = $derived($conferenceQuery?.data?.findManyConferences ?? []);

	function alreadRegistered(conferenceId: string) {
		if (
			$conferenceQuery.data?.findManySingleParticipants.find(
				(x) => x.conference.id === conferenceId
			)
		) {
			return true;
		}

		if (
			$conferenceQuery.data?.findManyDelegationMembers.find((x) => x.conference.id === conferenceId)
		) {
			return true;
		}

		return false;
	}
</script>

<div class="bg-light-blue-500 flex min-h-screen w-full flex-col items-center p-4">
	<hero class="my-20 text-center">
		<p>{m.selectConference()}</p>
	</hero>

	<main>
		{#if conferences.length === 0}
			<section class="flex w-full flex-col items-center gap-4">
				<img src={svgempty} alt="Empty" class="mb-10 w-1/2" />
				<h1 class="text-center text-3xl">{m.noConferenceOpenForRegistration()}</h1>
				<p class="text-center max-ch-md">{m.noConferenceOpenForRegistrationText()}</p>
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
						alreadyRegistered={alreadRegistered(conference.id)}
						baseSlug="/registration"
					/>
				{/each}
			</section>
		{/if}
	</main>
</div>
