<script lang="ts">
	import { PieChart } from '$lib/components/charts/echarts';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { statsQueryFilter, unifiedFilter } from '../stats.svelte';
	import { distributionChartData } from './chartData';

	let { conferenceId }: { conferenceId: string } = $props();

	const stats = $derived(
		await client.liveQuery.getConferenceStatistics({
			__args: { conferenceId, filter: statsQueryFilter() },
			registered: {
				delegationMembers: { total: true, applied: true, notApplied: true },
				singleParticipants: { total: true, applied: true, notApplied: true },
				supervisors: true
			},
			roleBased: {
				delegationMembersWithRole: true,
				delegationMembersWithoutRole: true,
				singleParticipantsWithRole: true,
				singleParticipantsWithoutRole: true
			}
		})
	);

	let { getFilteredValue } = unifiedFilter();

	const chartData = $derived(distributionChartData(stats, getFilteredValue));

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
