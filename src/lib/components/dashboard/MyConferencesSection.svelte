<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ConferenceSelectorCard from './ConferenceSelectorCard.svelte';

	interface Props {
		conferenceIds: string[];
	}

	let { conferenceIds }: Props = $props();
</script>

<section
	class="border-primary/30 bg-primary/5 flex flex-col gap-6 rounded-box border-2 p-6 shadow-sm"
>
	<div class="flex items-center gap-3">
		<h2 class="text-2xl font-bold tracking-tight">{m.yourConferences()}</h2>
		<span class="badge badge-primary badge-sm">{conferenceIds.length}</span>
	</div>
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each conferenceIds as conferenceId (conferenceId)}
			<ConferenceSelectorCard {conferenceId} />
		{/each}
	</div>
</section>
