<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { PieChart, BarChart } from '$lib/components/Charts/ECharts';
	import type { NationalityStats } from '../stats.svelte';

	interface Props {
		nationalityDistribution: NationalityStats[];
	}

	let { nationalityDistribution }: Props = $props();

	// Sort by count descending
	const sortedData = $derived([...nationalityDistribution].sort((a, b) => b.count - a.count));

	// For pie chart, limit to top 10 and group rest
	const pieData = $derived.by(() => {
		if (sortedData.length <= 10) {
			return sortedData.map((n) => ({ name: n.country, value: n.count }));
		}
		const top10 = sortedData.slice(0, 10);
		const rest = sortedData.slice(10);
		const restSum = rest.reduce((acc, n) => acc + n.count, 0);
		return [
			...top10.map((n) => ({ name: n.country, value: n.count })),
			{ name: m.statsOther(), value: restSum }
		];
	});

	// For bar chart
	const barLabels = $derived(sortedData.slice(0, 15).map((n) => n.country));
	const barValues = $derived(sortedData.slice(0, 15).map((n) => n.count));

	const totalParticipants = $derived(nationalityDistribution.reduce((acc, n) => acc + n.count, 0));
	const uniqueCountries = $derived(nationalityDistribution.length);

	let showPieChart = $state(true);
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-6">
	<div class="card-body p-4">
		<div class="flex items-center justify-between">
			<h2 class="card-title text-base font-semibold">
				<i class="fa-duotone fa-globe text-base-content/70"></i>
				{m.statsNationalityDistribution()}
			</h2>
			<div class="join">
				<button
					class="btn btn-sm join-item {showPieChart ? 'btn-active' : ''}"
					onclick={() => (showPieChart = true)}
				>
					<i class="fa-solid fa-chart-pie"></i>
				</button>
				<button
					class="btn btn-sm join-item {!showPieChart ? 'btn-active' : ''}"
					onclick={() => (showPieChart = false)}
				>
					<i class="fa-solid fa-chart-bar"></i>
				</button>
			</div>
		</div>

		{#if nationalityDistribution.length === 0}
			<div class="flex h-40 items-center justify-center text-sm opacity-50">
				{m.noDataAvailable()}
			</div>
		{:else}
			<!-- Summary -->
			<div class="stats bg-base-100 w-full mb-4">
				<div class="stat py-2 px-3">
					<div class="stat-title text-xs">{m.statsUniqueCountries()}</div>
					<div class="stat-value text-xl">{uniqueCountries}</div>
				</div>
				<div class="stat py-2 px-3">
					<div class="stat-title text-xs">{m.statsTotalParticipants()}</div>
					<div class="stat-value text-xl">{totalParticipants}</div>
				</div>
			</div>

			<!-- Chart -->
			<div class="rounded-lg bg-base-100 p-4">
				{#if showPieChart}
					<PieChart data={pieData} height="300px" />
				{:else}
					<BarChart labels={barLabels} values={barValues} horizontal height="350px" />
				{/if}
			</div>
		{/if}
	</div>
</section>
