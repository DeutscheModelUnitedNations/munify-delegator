<script lang="ts">
	import ConferenceCard from '$lib/components/ConferenceCard.svelte';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import RegistrationBreadcrumbs from '$lib/components/RegistrationBreadcrumbs.svelte';
	import svgempty from '$assets/undraw/empty_street.svg';

	let { data }: { data: PageData } = $props();

	const breadcrumbs = [{ href: '/registration', title: m.signup(), icon: 'user-plus' }];

	const alreadyRegistered = (conferenceId: string) => {
		if (!data.userData) return false;
		if (data.userData.delegationMemberships) {
			return data.userData.delegationMemberships.some(
				(membership) => membership.conferenceId === conferenceId
			);
		}
	};
</script>

<div class="bg-light-blue-500 flex min-h-screen w-full flex-col items-center p-4">
	<RegistrationBreadcrumbs {breadcrumbs} />
	<hero class="my-20 text-center">
		<h1 class="mb-3 text-3xl uppercase tracking-wider">{m.signup()}</h1>
		<p>{m.selectConference()}</p>
	</hero>

	<main>
		{#if data.conferences.length === 0}
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
				{#each data.conferences.sort((a, b) => {
					if (!a.start || !b.start) return 0;
					return new Date(a.start).getTime() - new Date(b.start).getTime();
				}) as item}
					<ConferenceCard
						{...item}
						alreadyRegistered={alreadyRegistered(item.id)}
						baseSlug="/registration"
					/>
				{/each}
			</section>
		{/if}
	</main>
</div>
