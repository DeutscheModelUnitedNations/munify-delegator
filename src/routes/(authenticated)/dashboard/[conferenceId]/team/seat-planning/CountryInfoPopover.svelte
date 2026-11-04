<script lang="ts">
	import Flag from '#lib/components/Flag.svelte';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { translateRegionalGroup } from '#lib/utils/enumTranslations';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import type { UnMember } from '#lib/helpers/seatPlanning/unMembers';
	import { createHoverDelay } from './hoverDelay';

	let popover = $state<HTMLDivElement>();
	let member = $state<UnMember>();
	let position = $state({ top: 0, left: 0 });
	let open = $state(false);
	/** the element the open popover belongs to, and the one a waiting popover will belong to */
	let anchorElement: HTMLElement | undefined;
	let pendingAnchor: HTMLElement | undefined;

	const delay = createHoverDelay<{ target: UnMember; anchor: HTMLElement }>({
		showDelay: 250,
		hideDelay: 150,
		onShow: ({ target, anchor }) => {
			const rect = anchor.getBoundingClientRect();
			member = target;
			anchorElement = anchor;
			pendingAnchor = undefined;
			position = {
				top: Math.min(rect.bottom + 4, window.innerHeight - 320),
				left: rect.left
			};
			if (!popover?.matches(':popover-open')) popover?.showPopover();
			open = true;
		},
		onHide: () => {
			if (popover?.matches(':popover-open')) popover.hidePopover();
			open = false;
		}
	});

	$effect(() => () => delay.dispose());

	/** a leave event alone is not reliable (a focused anchor, a popover that appears under a
	 * resting pointer), so while open the pointer's position decides */
	$effect(() => {
		if (!open) return;
		const onMove = (event: PointerEvent) => {
			const inside = event
				.composedPath()
				.some((node) => node === popover || node === anchorElement || node === pendingAnchor);
			if (inside) delay.stay();
			else delay.hide();
		};
		// the popover is placed once, so it would stay behind when the table scrolls under it
		const onScroll = (event: Event) => {
			if (!(event.target instanceof Node && popover?.contains(event.target))) delay.hide();
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('scroll', onScroll, { capture: true, passive: true });
		return () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('scroll', onScroll, { capture: true });
		};
	});

	/** Shows the facts about a state next to the hovered or focused element */
	export function show(target: UnMember, anchor: HTMLElement) {
		pendingAnchor = anchor;
		delay.show({ target, anchor });
	}

	export function hide() {
		pendingAnchor = undefined;
		delay.hide();
	}

	const languageNames = $derived.by(() => {
		try {
			return new Intl.DisplayNames([getLocale()], { type: 'language' });
		} catch {
			return undefined;
		}
	});

	// world-countries names languages by ISO 639-3 code with an English name
	const languageName = ({ code, fallback }: { code: string; fallback: string }) => {
		try {
			return languageNames?.of(code) ?? fallback;
		} catch {
			return fallback;
		}
	};
</script>

<!-- `hidden` until open: the card's `display: flex` would otherwise override the browser's
     `display: none` for a closed popover, leaving it on the page, outside the top layer -->
<div
	bind:this={popover}
	popover="manual"
	role="tooltip"
	onmouseenter={() => delay.stay()}
	onmouseleave={hide}
	class="card bg-base-100 border-base-300 m-0 hidden w-80 border shadow-xl open:flex"
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
				<dd>{translateRegionalGroup({ group: member.regionalGroup })}</dd>
				<dt class="text-base-content/60">{m.countryInfoRegion()}</dt>
				<dd>{member.subregion || member.region}</dd>
				<dt class="text-base-content/60">{m.countryInfoCapital()}</dt>
				<dd>{member.capital.join(', ')}</dd>
				<dt class="text-base-content/60">{m.countryInfoLanguages()}</dt>
				<dd>
					{member.languages
						.map((language) => languageName({ code: language.code, fallback: language.name }))
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
