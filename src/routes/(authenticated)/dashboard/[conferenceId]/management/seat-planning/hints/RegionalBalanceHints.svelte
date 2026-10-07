<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { regionalDeviations } from '$lib/helpers/seatPlanning/baselines';
	import { unMembers } from '$lib/helpers/seatPlanning/unMembers';
	import type { SeatPlanner } from '../seatPlanner.svelte';
	import RegionalBaselineModal from './RegionalBaselineModal.svelte';
	import RegionalBalanceCard from './RegionalBalanceCard.svelte';

	interface Props {
		planner: SeatPlanner;
		committees: { id: string; name: string; abbreviation: string }[];
		maxSuggestions: number;
	}

	let { planner, committees, maxSuggestions }: Props = $props();

	let baselineModalOpen = $state(false);
	let expanded = $state<string>();

	const abbreviations = $derived(new Map(committees.map((c) => [c.id, c.abbreviation])));
	const deviations = $derived(
		regionalDeviations(planner.committees, unMembers, planner.seatCounts)
	);
</script>

<section class="flex flex-col gap-3">
	<div class="flex items-center justify-between gap-2">
		<h4 class="text-sm font-semibold">{m.seatPlanningRegionalBalance()}</h4>
		<button class="btn btn-ghost btn-sm" onclick={() => (baselineModalOpen = true)}>
			<i class="fa-duotone fa-sliders"></i>
			{m.regionalBaselineButton()}
		</button>
	</div>
	<p class="text-base-content/70 text-xs">{m.regionalBalanceIntro()}</p>
	<div class="text-base-content/70 flex gap-3 text-xs">
		<span class="inline-flex items-center gap-1.5">
			<span class="bg-warning h-2 w-3 rounded-sm"></span>{m.regionalBalanceTooFew()}
		</span>
		<span class="inline-flex items-center gap-1.5">
			<span class="bg-primary h-2 w-3 rounded-sm"></span>{m.regionalBalanceTooMany()}
		</span>
	</div>

	{#each deviations as deviation (deviation.committeeId)}
		<RegionalBalanceCard
			{planner}
			{deviation}
			abbreviation={abbreviations.get(deviation.committeeId) ?? ''}
			expanded={expanded === deviation.committeeId}
			onToggle={() =>
				(expanded = expanded === deviation.committeeId ? undefined : deviation.committeeId)}
			{maxSuggestions}
		/>
	{/each}
</section>

<RegionalBaselineModal
	bind:open={baselineModalOpen}
	{committees}
	plannerCommittees={planner.committees}
/>
