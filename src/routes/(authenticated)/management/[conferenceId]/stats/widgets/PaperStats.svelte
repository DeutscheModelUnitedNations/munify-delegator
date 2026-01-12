<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getHistory, getSelectedHistory } from '../stats.svelte';
	import type { PaperStats } from '../stats.svelte';
	import StatsDesc from './StatsDesc.svelte';
	import { PieChart, StackedBarChart } from '$lib/components/Charts/ECharts';

	interface Props {
		paperStats: PaperStats;
	}

	let { paperStats }: Props = $props();

	// Get historical data for comparison
	let selectedHistory = $derived.by(() =>
		getHistory()?.find((x) => x.timestamp === getSelectedHistory())
	);

	// Historical paper stats (may be undefined for old history entries)
	let historicPaperStats = $derived(selectedHistory?.stats.paperStats);

	// Pie chart data for paper types
	const typeChartData = $derived.by(() => [
		{
			name: m.paperTypePositionPaper(),
			value: paperStats.byType.positionPaper,
			color: '#3b82f6'
		},
		{ name: m.paperTypeWorkingPaper(), value: paperStats.byType.workingPaper, color: '#8b5cf6' },
		{
			name: m.paperTypeIntroductionPaper(),
			value: paperStats.byType.introductionPaper,
			color: '#f59e0b'
		}
	]);

	// Stacked bar for status distribution (matching PaperHub colors)
	const statusChartData = $derived.by(() => [
		{
			name: m.paperStatusSubmitted(),
			value: paperStats.byStatus.submitted,
			color: '#facc15'
		}, // warning
		{
			name: m.paperStatusChangesRequested(),
			value: paperStats.byStatus.changesRequested,
			color: '#f87171'
		}, // error
		{
			name: m.paperStatusAccepted(),
			value: paperStats.byStatus.accepted,
			color: '#4ade80'
		}, // success
		{ name: m.paperStatusDraft(), value: paperStats.byStatus.draft, color: '#9ca3af' } // gray
	]);
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-12">
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-file-lines text-base-content/70"></i>
			{m.statsPaperOverview()}
		</h2>

		<!-- Stats row with historical comparison -->
		<div class="stats bg-base-100 w-full">
			<div class="stat py-3 px-4">
				<div class="stat-title text-xs">{m.statsPaperTotal()}</div>
				<div class="stat-value text-2xl">{paperStats.total}</div>
				<StatsDesc currentValue={paperStats.total} historicValue={historicPaperStats?.total} />
			</div>
			<div class="stat py-3 px-4">
				<div class="stat-title text-xs">{m.statsPapersWithReviews()}</div>
				<div class="stat-value text-2xl text-success">{paperStats.withReviews}</div>
				<StatsDesc
					currentValue={paperStats.withReviews}
					historicValue={historicPaperStats?.withReviews}
				/>
			</div>
			<div class="stat py-3 px-4">
				<div class="stat-title text-xs">{m.statsPapersWithoutReviews()}</div>
				<div class="stat-value text-2xl text-warning">{paperStats.withoutReviews}</div>
				<StatsDesc
					currentValue={paperStats.withoutReviews}
					historicValue={historicPaperStats?.withoutReviews}
				/>
			</div>
			<div class="stat py-3 px-4">
				<div class="stat-title text-xs">{m.paperStatusAccepted()}</div>
				<div class="stat-value text-2xl text-success">{paperStats.byStatus.accepted}</div>
				<StatsDesc
					currentValue={paperStats.byStatus.accepted}
					historicValue={historicPaperStats?.byStatus.accepted}
				/>
			</div>
		</div>

		<!-- Charts row -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
			<!-- Paper types pie chart -->
			<div>
				<h3 class="text-sm font-semibold mb-2">{m.statsPapersByType()}</h3>
				{#if paperStats.total > 0}
					<PieChart data={typeChartData} height="180px" donut={true} showLegend={true} />
				{:else}
					<p class="text-base-content/50 text-sm">{m.noDataAvailable()}</p>
				{/if}
			</div>

			<!-- Status distribution bar -->
			<div>
				<h3 class="text-sm font-semibold mb-2">{m.statsPapersByStatus()}</h3>
				{#if paperStats.total > 0}
					<StackedBarChart data={statusChartData} height="40px" showPercentage={true} />
					<!-- Legend -->
					<div class="flex flex-wrap gap-3 text-xs text-base-content/70 mt-2">
						<span class="flex items-center gap-1">
							<span class="inline-block w-3 h-3 bg-warning rounded"></span>
							{m.paperStatusSubmitted()} ({paperStats.byStatus.submitted})
						</span>
						<span class="flex items-center gap-1">
							<span class="inline-block w-3 h-3 bg-error rounded"></span>
							{m.paperStatusChangesRequested()} ({paperStats.byStatus.changesRequested})
						</span>
						<span class="flex items-center gap-1">
							<span class="inline-block w-3 h-3 bg-success rounded"></span>
							{m.paperStatusAccepted()} ({paperStats.byStatus.accepted})
						</span>
						<span class="flex items-center gap-1">
							<span class="inline-block w-3 h-3 bg-base-300 rounded"></span>
							{m.paperStatusDraft()} ({paperStats.byStatus.draft})
						</span>
					</div>
				{:else}
					<p class="text-base-content/50 text-sm">{m.noDataAvailable()}</p>
				{/if}
			</div>
		</div>

		<!-- Committee breakdown (collapsible) -->
		{#if paperStats.byCommittee.length > 0}
			<details class="collapse collapse-arrow bg-base-100 mt-3">
				<summary class="collapse-title text-sm font-medium py-2 min-h-0">
					{m.statsPapersByCommittee()}
				</summary>
				<div class="collapse-content">
					<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
						{#each paperStats.byCommittee.toSorted((a, b) => b.count - a.count) as committee (committee.committeeId)}
							<div class="flex items-center gap-2 p-2 bg-base-200 rounded">
								<span class="badge badge-primary badge-sm">{committee.abbreviation}</span>
								<span class="text-sm font-semibold">{committee.count}</span>
							</div>
						{/each}
					</div>
				</div>
			</details>
		{/if}
	</div>
</section>
