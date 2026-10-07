<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type { Snippet } from 'svelte';
	import type { IndividualApplicationOption, ProjectNation, NonStateActor } from './appData.svelte';

	type Props = {
		emptySeats?: number;
		children?: Snippet;
	} & (
		| { nation: ProjectNation; nsa?: never; role?: never; committees?: string[] }
		| { nation?: never; nsa: NonStateActor; role?: never; committees?: never }
		| { nation?: never; nsa?: never; role: IndividualApplicationOption; committees?: never }
	);

	let { nation, nsa, role, committees, emptySeats, children }: Props = $props();

	let hasEmptySeats = $derived(!!emptySeats && emptySeats > 0);
	let icon = $derived((nsa ?? role)?.fontAwesomeIcon ?? undefined);
	let title = $derived.by(() => {
		if (nation) return getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code);
		return nsa ? nsa.abbreviation : role?.name;
	});
	let subtitle = $derived.by(() => {
		if (committees) return committees.join(', ');
		return nsa ? 'NSA' : 'Single';
	});
</script>

<div
	class="flex grow-0 flex-col items-center gap-2 rounded-box p-2 shadow-md {emptySeats
		? 'bg-warning'
		: 'bg-base-200'}"
	role="region"
>
	<Flag alpha2Code={nation?.alpha2Code ?? undefined} nsa={!!nsa || !!role} {icon} size="sm" />
	<h2 class="text-sm font-bold">{title}</h2>
	<h3 class="text-xs">{subtitle}</h3>
	{@render children?.()}
	{#if hasEmptySeats}
		<div class="w-full rounded-box border-2 border-dashed text-center font-bold" role="region">
			{emptySeats}
		</div>
	{/if}
</div>
