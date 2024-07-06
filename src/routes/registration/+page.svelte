<script lang="ts">
	import ConferenceCard from '$lib/components/ConferenceCard.svelte';
	import { fly } from 'svelte/transition';
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">Anmeldung</h1>
		<p>Wählen Sie zuerst die Konferenz aus, zu der Sie sich gerne anmelden möchten.</p>
		<a class="btn btn-warning mt-6" href=".">Zurück</a>
	</hero>

	<main>
		<section
			class="w-full flex flex-col md:flex-row justify-center items-center md:items-stretch gap-8 flex-wrap"
		>
			{#each data.conferences as item}
				<ConferenceCard {...item} baseSlug="/registration" />
			{/each}
		</section>
	</main>
</div>
