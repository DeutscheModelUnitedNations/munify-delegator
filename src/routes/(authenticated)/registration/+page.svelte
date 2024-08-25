<script lang="ts">
	import ConferenceCard from '$lib/components/ConferenceCard.svelte';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';

	let { data }: { data: PageData } = $props();
</script>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">{m.signup()}</h1>
		<p>{m.selectConference()}</p>
		<a class="btn btn-warning mt-6" href=".">{m.back()}</a>
	</hero>

	<main>
		<section
			class="w-full flex flex-col md:flex-row justify-center items-center md:items-stretch gap-8 flew-wrap"
		>
			{#each data.conferences as item}
				<ConferenceCard {...item} baseSlug="/registration" />
			{/each}
		</section>
	</main>
</div>
