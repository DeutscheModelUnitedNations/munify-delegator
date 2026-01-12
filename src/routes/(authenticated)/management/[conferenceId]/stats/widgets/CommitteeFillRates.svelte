<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { GaugeChart } from '$lib/components/Charts/ECharts';
	import type { CommitteeFillRate } from '../stats.svelte';

	interface Props {
		committeeFillRates: CommitteeFillRate[];
	}

	let { committeeFillRates }: Props = $props();

	// Sort by fill percentage descending
	const sortedCommittees = $derived(
		[...committeeFillRates].sort((a, b) => b.fillPercentage - a.fillPercentage)
	);
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-6">
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-users-between-lines text-base-content/70"></i>
			{m.statsCommitteeFillRates()}
		</h2>

		{#if committeeFillRates.length === 0}
			<div class="flex h-40 items-center justify-center text-sm opacity-50">
				{m.noCommittees()}
			</div>
		{:else}
			<!-- Committee gauges grid -->
			<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
				{#each sortedCommittees as committee (committee.committeeId)}
					<div class="rounded-lg bg-base-100 p-3">
						<GaugeChart value={committee.fillPercentage} height="120px" />
						<div class="mt-1 text-center">
							<div class="text-xs font-medium">{committee.name}</div>
							<div class="text-xs opacity-70">
								{committee.assignedSeats} / {committee.totalSeats}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
