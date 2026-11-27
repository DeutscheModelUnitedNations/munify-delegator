<script lang="ts">
	import { browser } from '$app/env';
	import { m } from '#lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { loadCountryShapes, zoomForArea } from '#lib/countryStats/countryShapes';
	import type { CountryFacts } from '#lib/countryStats/countryFacts';
	import CountryGlobeMap from './CountryGlobeMap.svelte';

	/** Below this many km² the outline is a speck on the globe, so a dot marks the country. */
	const MARKER_BELOW_AREA = 30_000;

	let { facts }: { facts: CountryFacts } = $props();

	const alpha3Code = $derived(facts.alpha3Code);
	const borders = $derived(facts.borders);
	const name = $derived(getFullTranslatedCountryNameFromISO3Code(alpha3Code));

	// The outlines are fetched from the app's assets, which the server has no URL for
	const shapes = $derived(
		browser
			? await loadCountryShapes({
					alpha3Code,
					borders,
					nameOf: getFullTranslatedCountryNameFromISO3Code
				})
			: undefined
	);
</script>

<figure class="flex flex-col gap-2">
	{#if shapes}
		<CountryGlobeMap
			{shapes}
			center={facts.center}
			zoom={zoomForArea(facts.area)}
			{name}
			marker={facts.area < MARKER_BELOW_AREA}
		/>
	{:else}
		<div class="skeleton h-80 w-full md:h-96"></div>
	{/if}
	<figcaption class="text-base-content/70 flex flex-wrap gap-x-4 gap-y-1 text-xs">
		<span class="sr-only">{m.countryGlobeLabel({ country: name })}</span>
		<span class="flex items-center gap-1.5" aria-hidden="true">
			<span class="inline-block h-3 w-3 rounded-sm bg-[#4fa3d9]"></span>
			{name}
		</span>
		{#if borders.length > 0}
			<span class="flex items-center gap-1.5" aria-hidden="true">
				<span class="inline-block h-3 w-3 rounded-sm bg-[#f1b434]/60"></span>
				{m.countryGlobeNeighbours()}
			</span>
		{/if}
	</figcaption>
</figure>
