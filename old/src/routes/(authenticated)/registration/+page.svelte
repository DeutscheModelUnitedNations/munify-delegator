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

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<RegistrationBreadcrumbs {breadcrumbs} />
	<hero class="my-20 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">{m.signup()}</h1>
		<p>{m.selectConference()}</p>
	</hero>

	<main>
		{#if data.conferences.length === 0}
			<section class="w-full flex flex-col items-center gap-4">
				<img src={svgempty} alt="Empty" class="w-1/2 mb-10" />
				<h1 class="text-3xl text-center">{m.noConferenceOpenForRegistration()}</h1>
				<p class="max-ch-md text-center">{m.noConferenceOpenForRegistrationText()}</p>
				<div class="flex gap-4 flex-col md:flex-row-reverse">
					<a class="btn mt-10" href="/">{m.backToHome()}</a>
				</div>
			</section>
		{:else}
			<section
				class="flex flex-col md:flex-row justify-center items-center md:items-stretch gap-8 flex-wrap"
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
