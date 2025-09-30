<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import svgempty from '$assets/undraw/empty_street.svg';
	import ConferenceCard from '$lib/components/ConferenceCard/ConferenceCard.svelte';

	let { data }: { data: PageData } = $props();
	let conferenceQuery = $derived(data.ConferenceOpenForRegistrationQuery);
	let conferences = $derived($conferenceQuery?.data?.findManyConferences ?? []);

	function alreadyRegistered(conferenceId: string) {
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

		if (
			$conferenceQuery.data?.findManyConferenceSupervisors.find(
				(x) => x.conference.id === conferenceId
			)
		) {
			return true;
		}

		return false;
	}
</script>

<div class="bg-light-blue-500 flex min-h-screen w-full flex-col items-center p-4">
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
