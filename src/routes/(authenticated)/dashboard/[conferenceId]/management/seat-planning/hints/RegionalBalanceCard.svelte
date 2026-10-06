<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateRegionalBaseline, translateRegionalGroup } from '$lib/utils/enumTranslations';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type { regionalDeviations } from '$lib/helpers/seatPlanning/baselines';
	import type { SeatPlanner } from '../seatPlanner.svelte';
	import RegionalDeviationBars from './RegionalDeviationBars.svelte';

	interface Props {
		planner: SeatPlanner;
		deviation: ReturnType<typeof regionalDeviations>[number];
		abbreviation: string;
		expanded: boolean;
		onToggle: () => void;
		maxSuggestions: number;
	}

	let { planner, deviation, abbreviation, expanded, onToggle, maxSuggestions }: Props = $props();

	const recommendation = $derived(deviation.recommendation);
	const transfer = $derived.by(() => {
		if (!recommendation) return '';
		const groups = {
			from: translateRegionalGroup(recommendation.from.group, true),
			to: translateRegionalGroup(recommendation.to.group, true)
		};
		return recommendation.seats === 1
			? m.regionalBalanceTransferOne(groups)
			: m.regionalBalanceTransferMany({ ...groups, seats: recommendation.seats });
	});
	/** seats with assigned delegates cannot be given up */
	const removals = $derived(
		deviation.removals
			.filter((nation) => !planner.lockedBy(deviation.committeeId, nation))
			.slice(0, maxSuggestions)
	);
	const additions = $derived(deviation.suggestions.slice(0, maxSuggestions));
</script>

<div class="bg-base-100 border-base-300 rounded-box flex flex-col gap-1.5 border p-3">
	<button
		class="flex min-h-7 items-center gap-2 text-left"
		aria-expanded={expanded}
		onclick={onToggle}
	>
		<span class="text-sm font-semibold">{abbreviation}</span>
		<span class="text-base-content/70 text-xs">{deviation.seats}</span>
		<span class="badge badge-ghost badge-xs">{translateRegionalBaseline(deviation.baseline)}</span>
		<span
			class="badge badge-sm ml-auto {deviation.seatsToMove >= 3 ? 'badge-warning' : 'badge-ghost'}"
		>
			{deviation.seatsToMove === 0
				? m.regionalBalanceBalanced()
				: m.regionalBalanceSeatsToMove({ count: deviation.seatsToMove })}
		</span>
	</button>

	{#if recommendation}
		<button
			class="bg-base-200 hover:bg-base-300 flex items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs"
			aria-expanded={expanded}
			onclick={onToggle}
		>
			<i class="fa-duotone fa-arrow-right-arrow-left mt-0.5"></i>
			<span class="flex flex-col">
				<span class="text-base-content/70">{m.regionalBalanceRecommendation()}</span>
				<span class="font-semibold">{transfer}</span>
				<span class="text-base-content/70">
					{m.regionalBalanceTransferEffect({ count: recommendation.seatsToMoveAfter })}
				</span>
			</span>
		</button>
	{/if}

	<RegionalDeviationBars groups={deviation.groups} />

	{#if expanded && recommendation}
		<div class="border-base-300 mt-1 flex flex-col gap-2 border-t border-dashed pt-2 text-xs">
			<p>
				{m.regionalBalanceRemoveTitle({
					group: translateRegionalGroup(recommendation.from.group, true)
				})}
			</p>
			<div class="flex flex-wrap gap-1.5">
				{#each removals as nation (nation)}
					{@const name = getFullTranslatedCountryNameFromISO3Code(nation)}
					<button
						class="btn btn-outline btn-primary btn-xs rounded-full"
						aria-label={m.regionalBalanceRemoveSeat({ nation: name, committee: abbreviation })}
						onclick={() => planner.setSeat(deviation.committeeId, nation, false)}
					>
						− {name}
					</button>
				{:else}
					<p class="text-base-content/70">{m.regionalBalanceNoCandidates()}</p>
				{/each}
			</div>
			<p>
				{m.regionalBalanceAddTitle({
					group: translateRegionalGroup(recommendation.to.group, true)
				})}
			</p>
			<div class="flex flex-wrap gap-1.5">
				{#each additions as nation (nation)}
					{@const name = getFullTranslatedCountryNameFromISO3Code(nation)}
					<button
						class="btn btn-outline btn-warning btn-xs rounded-full"
						aria-label={m.regionalBalanceAddSeat({ nation: name, committee: abbreviation })}
						onclick={() => planner.setSeat(deviation.committeeId, nation, true)}
					>
						+ {name}
					</button>
				{:else}
					<p class="text-base-content/70">{m.regionalBalanceNoCandidates()}</p>
				{/each}
			</div>
		</div>
	{/if}
</div>
