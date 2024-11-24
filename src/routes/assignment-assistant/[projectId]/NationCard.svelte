<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { Snippet } from 'svelte';
	import type { IndividualApplicationOption, Nation, NonStateActor } from './appData.svelte';

	type Props = {
		emptySeats?: number;
		children?: Snippet;
	} & (
		| { nation: Nation; nsa?: never; role?: never; committees?: string[] }
		| { nation?: never; nsa: NonStateActor; role?: never; committees?: never }
		| { nation?: never; nsa?: never; role: IndividualApplicationOption; committees?: never }
	);

	let { nation, nsa, role, committees, emptySeats, children }: Props = $props();
</script>

<div
	class="flex grow-0 flex-col items-center gap-2 rounded-md p-2 shadow-md {!emptySeats ||
	emptySeats === 0
		? 'bg-base-200'
		: 'bg-warning'}"
	role="region"
>
	<Flag
		alpha2Code={nation?.alpha2Code ?? undefined}
		nsa={!!nsa || !!role}
		icon={nsa ? (nsa.fontAwesomeIcon ?? undefined) : role && (role?.fontAwesomeIcon ?? undefined)}
		size="sm"
	/>
	<h2 class="text-sm font-bold">
		{nation
			? getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)
			: nsa
				? nsa.abbreviation
				: role?.name}
	</h2>
	<h3 class="text-xs">{committees ? committees.join(', ') : nsa ? 'NSA' : 'Single'}</h3>
	{#if children}
		{@render children()}
	{/if}
	{#if emptySeats && emptySeats > 0}
		<div class="w-full rounded-lg border-2 border-dashed text-center font-bold" role="region">
			{emptySeats}
		</div>
	{/if}
</div>
