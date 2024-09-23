<script lang="ts">
	import ConferenceCard from '$lib/components/ConferenceCard.svelte';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages';

	let { data }: { data: PageData } = $props();
</script>

<div class="w-full flex flex-col items-center gap-4 p-10">
	<h1 class="text-2xl font-bold">{m.management()}</h1>
	<p class="text-center max-ch-md">
		{m.pleaseSelectAConferenceToManage()}
	</p>
	<div class="flex flex-wrap justify-center gap-4">
		{#each data.conferences as conference}
			<ConferenceCard {...conference} baseSlug="/management" btnText={m.manage()} />
		{/each}
	</div>
</div>
