<script lang="ts">
	import ConferenceCard from '$lib/components/ConferenceCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="w-full flex flex-col items-center gap-4 p-10">
	<h1 class="text-2xl font-bold">Verwaltung</h1>
	<p class="text-center max-ch-md">
		Wähle die Konferenz aus, die du verwalten möchtest. Wenn die Konferenz nicht angezeigt wird,
		lade die Seite neu oder wende dich an einen Administrator.
	</p>
	<div class="flex flex-wrap justify-center gap-4">
		{#each data.conferences as conference}
			<ConferenceCard {...conference} baseSlug="/management" btnText="Verwalten" />
		{/each}
	</div>
</div>
