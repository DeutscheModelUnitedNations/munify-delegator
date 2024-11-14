<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { Snippet } from 'svelte';
	import type { Nation } from './appData.svelte';

	interface Props {
		nation: Nation;
		committees: string[];
		emptySeats?: number;
		children?: Snippet;
	}

	let { nation, committees, emptySeats, children }: Props = $props();
</script>

<div
	class="flex grow-0 flex-col items-center gap-2 rounded-md bg-base-200 p-2 shadow-md"
	role="region"
>
	<Flag alpha2Code={nation.alpha2Code} size="sm" />
	<h2 class="text-sm font-bold">{getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)}</h2>
	<h3 class="text-xs">{committees.join(', ')}</h3>
	{#if children}
		{@render children()}
	{/if}
	{#if emptySeats && emptySeats > 0}
		<div class="w-full rounded-lg border-2 border-dashed text-center font-bold" role="region">
			{emptySeats}
		</div>
	{/if}
</div>
