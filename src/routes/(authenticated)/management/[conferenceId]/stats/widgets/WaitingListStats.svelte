<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { PieChart } from '$lib/components/Charts/ECharts';
	import type { PageData } from '../$types';

	let props: { data: PageData } = $props();
	let stats = $derived(props.data.stats);

	const chartData = $derived.by(() => {
		if (!stats?.waitingList) return [];

		return [
			{ name: m.statsWaitingListAssigned(), value: stats.waitingList.assigned },
			{ name: m.statsWaitingListUnassigned(), value: stats.waitingList.unassigned }
		];
	});
</script>

<section
	class="card border border-base-300 bg-base-200 col-span-2 md:col-span-6 xl:col-span-4 xl:row-span-2"
>
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-list-check text-base-content/70"></i>
			{m.statsWaitingList()}
		</h2>

		{#if stats?.waitingList}
			<div class="stats bg-base-100 w-full">
				<div class="stat py-2 px-3">
					<div class="stat-title text-xs">{m.registrationsTotal()}</div>
					<div class="stat-value text-xl">{stats.waitingList.total}</div>
				</div>
				<div class="stat py-2 px-3">
					<div class="stat-title text-xs">{m.statsWaitingListAssigned()}</div>
					<div class="stat-value text-xl text-success">{stats.waitingList.assigned}</div>
				</div>
				<div class="stat py-2 px-3">
					<div class="stat-title text-xs">{m.statsWaitingListUnassigned()}</div>
					<div class="stat-value text-xl text-warning">{stats.waitingList.unassigned}</div>
				</div>
			</div>

			{#if stats.waitingList.total > 0}
				<div class="mt-3 rounded-lg bg-base-100 p-4">
					<PieChart data={chartData} height="200px" donut={true} showLegend={true} />
				</div>
			{/if}

			<div class="mt-2 text-xs text-base-content/70 flex gap-4">
				<span>
					<i class="fa-duotone fa-eye mr-1"></i>
					{m.statsWaitingListVisible()}: {stats.waitingList.visible}
				</span>
				<span>
					<i class="fa-duotone fa-eye-slash mr-1"></i>
					{m.statsWaitingListHidden()}: {stats.waitingList.hidden}
				</span>
			</div>
		{:else}
			<p class="text-base-content/70">{m.noDataAvailable()}</p>
		{/if}
	</div>
</section>
