<script lang="ts">
	import { PieChart } from '$lib/components/Charts/ECharts';
	import { m } from '$lib/paraglide/messages';
	import { unifiedFilter } from '../stats.svelte';
	import type { PageData } from '../$types';

	let props: { data: PageData } = $props();
	let stats = $derived(props.data.stats);

	let { getFilteredValue } = unifiedFilter();

	const chartData = $derived.by(() => {
		if (!stats?.registered) return [];

		const delegationMembers =
			getFilteredValue(stats.registered.delegationMembers, stats.roleBased, 'delegationMembers') ??
			0;
		const singleParticipants =
			getFilteredValue(
				stats.registered.singleParticipants,
				stats.roleBased,
				'singleParticipants'
			) ?? 0;
		const supervisors = stats.registered.supervisors;

		return [
			{ name: m.delegationMembers(), value: delegationMembers, color: '#3b82f6' }, // blue/primary
			{ name: m.singleParticipants(), value: singleParticipants, color: '#8b5cf6' }, // violet/secondary
			{ name: m.supervisors(), value: supervisors, color: '#f59e0b' } // amber/accent
		];
	});

	const total = $derived(chartData.reduce((sum, item) => sum + item.value, 0));
</script>

<section
	class="card border border-base-300 bg-base-200 col-span-2 md:col-span-6 xl:col-span-4 xl:row-span-2"
>
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-users text-base-content/70"></i>
			{m.statsParticipantDistribution()}
		</h2>

		{#if stats?.registered}
			<div class="stats bg-base-100 w-full">
				<div class="stat py-2 px-3">
					<div class="stat-title text-xs">{m.delegationMembers()}</div>
					<div class="stat-value text-xl">{chartData[0]?.value ?? 0}</div>
				</div>
				<div class="stat py-2 px-3">
					<div class="stat-title text-xs">{m.singleParticipants()}</div>
					<div class="stat-value text-xl">{chartData[1]?.value ?? 0}</div>
				</div>
				<div class="stat py-2 px-3">
					<div class="stat-title text-xs">{m.supervisors()}</div>
					<div class="stat-value text-xl">{chartData[2]?.value ?? 0}</div>
				</div>
			</div>

			{#if total > 0}
				<PieChart data={chartData} height="200px" donut={true} showLegend={true} />
			{/if}
		{:else}
			<p class="text-base-content/70">{m.noDataAvailable()}</p>
		{/if}
	</div>
</section>
