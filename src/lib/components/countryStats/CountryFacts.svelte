<script lang="ts">
	import Flag from '#lib/components/Flag.svelte';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { alpha3ToAlpha2 } from '#lib/helpers/countryCodes';
	import type { CountryFacts } from '#lib/countryStats/countryFacts';
	import { translateWorldRegion } from '#lib/countryStats/worldRegions';

	let { facts }: { facts: CountryFacts } = $props();

	/** Intl names nearly every language and currency; where it does not, the package's English name */
	function displayName({
		type,
		code,
		fallback
	}: {
		type: 'language' | 'currency';
		code: string;
		fallback: string;
	}) {
		try {
			const name = new Intl.DisplayNames([getLocale()], { type }).of(code);
			return name && name !== code ? name : fallback;
		} catch {
			return fallback;
		}
	}

	const languages = $derived(
		facts.languages
			.map(({ code, name }) => displayName({ type: 'language', code, fallback: name }))
			.join(', ')
	);
	const currencies = $derived(
		facts.currencies
			.map(
				({ code, name, symbol }) =>
					`${displayName({ type: 'currency', code, fallback: name })} (${symbol || code})`
			)
			.join(', ')
	);
	const area = $derived(new Intl.NumberFormat(getLocale()).format(facts.area));
	// world-countries has demonyms in English and French only
	const demonym = $derived(getLocale() === 'en' ? facts.demonym : undefined);
</script>

{#snippet fact({ label, value }: { label: string; value: string })}
	<div>
		<dt class="text-base-content/60 text-xs">{label}</dt>
		<dd class="font-semibold">{value}</dd>
	</div>
{/snippet}

<div class="flex flex-col gap-5">
	<section class="flex flex-col gap-2">
		<h4 class="text-sm font-bold">
			<i aria-hidden="true" class="ph-duotone ph-mountains text-primary mr-1"></i>
			{m.countryInfoGeography()}
		</h4>
		<dl class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
			{#if facts.capitals.length > 0}
				{@render fact({ label: m.countryInfoCapital(), value: facts.capitals.join(', ') })}
			{/if}
			{@render fact({ label: m.countryInfoArea(), value: m.countryInfoAreaValue({ area }) })}
			{@render fact({
				label: m.countryInfoRegion(),
				value: translateWorldRegion({ region: facts.region, subregion: facts.subregion })
			})}
			{@render fact({
				label: m.countryInfoLandlocked(),
				value: facts.landlocked ? m.yes() : m.no()
			})}
			<div class="sm:col-span-2">
				<dt class="text-base-content/60 text-xs">{m.countryInfoNeighbours()}</dt>
				<dd>
					{#if facts.borders.length > 0}
						<ul class="mt-1 flex flex-wrap gap-2">
							{#each facts.borders as border (border)}
								{@const alpha2 = alpha3ToAlpha2(border)}
								<li
									class="bg-base-100 flex items-center gap-1.5 rounded-field py-0.5 pr-2 pl-0.5 text-sm"
								>
									{#if alpha2}
										<Flag alpha2Code={alpha2.toLowerCase()} size="xs" />
									{/if}
									{getFullTranslatedCountryNameFromISO3Code(border)}
								</li>
							{/each}
						</ul>
					{:else}
						<span class="font-semibold">{m.countryInfoNoNeighbours()}</span>
					{/if}
				</dd>
			</div>
		</dl>
	</section>

	<section class="flex flex-col gap-2">
		<h4 class="text-sm font-bold">
			<i aria-hidden="true" class="ph-duotone ph-users-three text-primary mr-1"></i>
			{m.countryInfoPeopleAndLanguage()}
		</h4>
		<dl class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
			{#if languages}
				{@render fact({ label: m.countryInfoLanguages(), value: languages })}
			{/if}
			{#if demonym}
				{@render fact({ label: m.countryInfoDemonym(), value: demonym })}
			{/if}
		</dl>
	</section>

	<section class="flex flex-col gap-2">
		<h4 class="text-sm font-bold">
			<i aria-hidden="true" class="ph-duotone ph-coins text-primary mr-1"></i>
			{m.countryInfoEconomyAndCodes()}
		</h4>
		<dl class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
			{#if currencies}
				{@render fact({ label: m.countryInfoCurrencies(), value: currencies })}
			{/if}
			{#if facts.callingCode}
				{@render fact({ label: m.countryInfoCallingCode(), value: facts.callingCode })}
			{/if}
			{#if facts.topLevelDomains.length > 0}
				{@render fact({
					label: m.countryInfoTopLevelDomain(),
					value: facts.topLevelDomains.join(', ')
				})}
			{/if}
			{@render fact({
				label: m.countryInfoIsoCodes(),
				value: [facts.alpha2Code, facts.alpha3Code, facts.numericCode].filter(Boolean).join(' · ')
			})}
		</dl>
	</section>
</div>
