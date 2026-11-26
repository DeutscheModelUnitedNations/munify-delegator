<script lang="ts">
	import Flag from '#lib/components/Flag.svelte';
	import type { SeatEmblem } from './seatEmblem';

	/** A person's part as one mark: the flag or icon with the committee below, its name on hover. */
	let { emblem }: { emblem: SeatEmblem } = $props();
</script>

<div class="flex w-16 shrink-0 flex-col" title={emblem.name}>
	<Flag size="sm" alpha2Code={emblem.alpha2Code} nsa={!emblem.alpha2Code} icon={emblem.icon} />
	{#if emblem.committee}
		<span class="bg-base-content/10 truncate px-1 py-0.5 text-center text-xs font-bold">
			{emblem.committee}
		</span>
	{/if}
	{#if emblem.alpha2Code}
		<span class="sr-only">{emblem.name}</span>
	{/if}
</div>
