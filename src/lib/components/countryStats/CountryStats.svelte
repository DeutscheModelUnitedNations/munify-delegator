<script lang="ts">
	import Flag from '#lib/components/Flag.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import { logger } from '#lib/logger';
	import { m } from '#lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { countryFactsOf } from '#lib/countryStats/countryFacts';
	import CountryFacts from './CountryFacts.svelte';
	import CountryGlobe from './CountryGlobe.svelte';
	import CountryIndicatorStats from './CountryIndicatorStats.svelte';

	/**
	 * Everything the app knows about a country for preparing its delegation: a globe with the
	 * country and its neighbours, facts from world-countries and figures from the World Bank. Each
	 * part loads on its own, so a slow World Bank holds up nothing else.
	 */
	let { countryCode }: { countryCode: string } = $props();

	const facts = $derived(countryFactsOf(countryCode));
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center gap-4">
		{#if facts}
			<Flag alpha2Code={facts.alpha2Code.toLowerCase()} size="sm" />
		{/if}
		<div>
			<div class="text-base-content/60 text-xs">{m.countryOfficialName()}</div>
			<div class="text-xl font-bold">{getFullTranslatedCountryNameFromISO3Code(countryCode)}</div>
		</div>
	</div>

	{#if facts}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<svelte:boundary onerror={(error) => logger.warn('Loading the country globe failed', error)}>
				<CountryGlobe {facts} />
				{#snippet pending()}
					<div class="skeleton h-80 w-full md:h-96"></div>
				{/snippet}
				{#snippet failed(_error, reset)}
					<LoadError onretry={reset} />
				{/snippet}
			</svelte:boundary>
			<CountryFacts {facts} />
		</div>
	{/if}

	<svelte:boundary onerror={(error) => logger.warn('Loading the World Bank figures failed', error)}>
		<CountryIndicatorStats {countryCode} />
		{#snippet pending()}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
					<div class="skeleton h-28 w-full"></div>
				{/each}
			</div>
		{/snippet}
		{#snippet failed(_error, reset)}
			<LoadError onretry={reset} />
		{/snippet}
	</svelte:boundary>

	<p class="text-base-content/60 text-xs">{m.countryStatsSources()}</p>
</div>
