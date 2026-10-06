<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { translateRegionalGroup } from '$lib/services/enumTranslations';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { UnMember } from '$lib/services/seatPlanning/unMembers';

	let popover = $state<HTMLDivElement>();
	let member = $state<UnMember>();
	let position = $state({ top: 0, left: 0 });

	/** Shows the facts about a state next to the element that was clicked */
	export function show(target: UnMember, anchor: HTMLElement) {
		const rect = anchor.getBoundingClientRect();
		member = target;
		position = {
			top: Math.min(rect.bottom + 4, window.innerHeight - 320),
			left: rect.left
		};
		popover?.showPopover();
	}

	const languageNames = $derived.by(() => {
		try {
			return new Intl.DisplayNames([getLocale()], { type: 'language' });
		} catch {
			return undefined;
		}
	});

	// world-countries names languages by ISO 639-3 code with an English name
	const languageName = (code: string, fallback: string) => {
		try {
			return languageNames?.of(code) ?? fallback;
		} catch {
			return fallback;
		}
	};
</script>

<div
	bind:this={popover}
	popover="auto"
	class="card bg-base-100 border-base-300 m-0 w-80 border shadow-xl"
	style:position="fixed"
	style:inset="auto"
	style:top="{position.top}px"
	style:left="{position.left}px"
>
	{#if member}
		<div class="card-body gap-3 p-4">
			<div class="flex items-center gap-3">
				<Flag alpha2Code={member.alpha2Code} size="xs" />
				<h3 class="card-title text-base">
					{getFullTranslatedCountryNameFromISO3Code(member.alpha3Code)}
				</h3>
			</div>
			<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
				<dt class="text-base-content/60">{m.countryInfoRegionalGroup()}</dt>
				<dd>{translateRegionalGroup(member.regionalGroup)}</dd>
				<dt class="text-base-content/60">{m.countryInfoRegion()}</dt>
				<dd>{member.subregion || member.region}</dd>
				<dt class="text-base-content/60">{m.countryInfoCapital()}</dt>
				<dd>{member.capital.join(', ')}</dd>
				<dt class="text-base-content/60">{m.countryInfoLanguages()}</dt>
				<dd>
					{member.languages
						.map((language) => languageName(language.code, language.name))
						.join(', ')}
				</dd>
				<dt class="text-base-content/60">{m.countryInfoNeighbours()}</dt>
				<dd>
					{member.borders.length > 0
						? member.borders.map(getFullTranslatedCountryNameFromISO3Code).join(', ')
						: m.countryInfoNoNeighbours()}
				</dd>
				<dt class="text-base-content/60">{m.countryInfoLandlocked()}</dt>
				<dd>{member.landlocked ? m.yes() : m.no()}</dd>
			</dl>
		</div>
	{/if}
</div>
