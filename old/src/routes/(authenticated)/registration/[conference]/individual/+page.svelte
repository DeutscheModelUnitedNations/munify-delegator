<script lang="ts">
	import PlainCard from '$lib/components/PlainCard.svelte';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import RegistrationBreadcrumbs from '$lib/components/RegistrationBreadcrumbs.svelte';

	let { data }: { data: PageData } = $props();

	const breadcrumbs = [
		{ href: '/registration', icon: 'user-plus' },
		{
			href: `/registration/${data.conferenceId}`,
			title: data.conferenceData.title
		},
		{
			href: `/registration/${data.conferenceId}/individual`,
			title: m.individualApplication(),
			icon: 'square-1'
		}
	];
</script>

<div class="bg-light-blue-500 flex min-h-screen w-full flex-col items-center p-4">
	<RegistrationBreadcrumbs {breadcrumbs} />
	<hero class="my-20 text-center">
		<h1 class="mb-3 text-3xl uppercase tracking-wider">{m.individualApplication()}</h1>
		<p class="max-ch-md">
			{m.individualApplicationDescription2()}
		</p>
	</hero>

	<main>
		<section class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.availableCustomConferenceRoles as { description, fontAwesomeIcon, id, name }}
				<PlainCard
					title={name}
					{description}
					fontAwesomeIcon={fontAwesomeIcon ?? 'fa-user-tie'}
					link={`./individual/${id}`}
				/>
			{/each}
		</section>
	</main>
</div>
