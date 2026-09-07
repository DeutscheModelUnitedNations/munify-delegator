<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import svgempty from '$assets/undraw/empty_street.svg';
	import ConferenceCard from '$lib/components/ConferenceCard/ConferenceCard.svelte';

	let { data }: { data: PageData } = $props();
	let conferenceQuery = $derived(data.ConferenceOpenForRegistrationQuery);
	let conferences = $derived($conferenceQuery?.data?.findManyConferences ?? []);
	// Only treat the query as loading while there is nothing to render yet, so a
	// background refetch does not replace the already visible conference list.
	let loading = $derived(!$conferenceQuery?.data && !$conferenceQuery?.errors);

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

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h1 class="text-xl">{m.selectConference()}</h1>
	</hero>

	<main>
		{#if loading}
			<section class="flex w-full flex-col items-center gap-4" aria-busy="true">
				<span class="loading loading-spinner loading-lg"></span>
				<p class="text-center">{m.loadingConferences()}</p>
			</section>
		{:else if conferences.length === 0}
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
