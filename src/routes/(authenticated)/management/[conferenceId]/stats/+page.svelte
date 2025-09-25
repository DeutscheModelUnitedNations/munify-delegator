<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import DaysUntil from './widgets/DaysUntil.svelte';
	import type { PageData } from './$types';
	import AppliedChartAndStats from './widgets/AppliedChartAndStats.svelte';
	import AgeChart from './widgets/AgeChart.svelte';
	import Filter from './widgets/Filter.svelte';
	import DistributionChart from './widgets/DistributionChart.svelte';
	import RegistrationStats from './widgets/RegistrationStats.svelte';
	import IndividualRoles from './widgets/IndividualRoles.svelte';
	import { format } from 'date-fns';
	import { onMount } from 'svelte';
	import {
		getHistory,
		getSelectedHistory,
		setHistory,
		setSelectedHistory,
		type StatsTypeHistoryEntry
	} from './stats.svelte';
	import NumberMatrix from './widgets/NumberMatrix.svelte';
	import DietMatrix from './widgets/DietMatrix.svelte';
	import GenderMatrix from './widgets/GenderMatrix.svelte';
	import Status from './widgets/Status.svelte';
	let { data }: { data: PageData } = $props();

	onMount(() => {
		// look for history in local storage
		const history: StatsTypeHistoryEntry[] = JSON.parse(
			localStorage.getItem('statsHistory') ?? '[]'
		);

		if (
			!history.find(
				(x) =>
					`${x.timestamp}_${x.conferenceId}` ===
					`${format(Date.now(), 'yyyy-MM-dd')}_${data.conferenceId}`
			) &&
			data.stats
		) {
			history.unshift({
				stats: data.stats,
				timestamp: format(Date.now(), 'yyyy-MM-dd'),
				conferenceId: data.conferenceId
			});
		}
		setHistory(history);

		localStorage.setItem('statsHistory', JSON.stringify(history));

		// After updating the history in the local storage, we can filter for the history of that conference
		setHistory(history.filter((x) => x.conferenceId === data.conferenceId));
		setSelectedHistory(
			history.find((x) => x.timestamp !== format(Date.now(), 'yyyy-MM-dd'))?.timestamp
		);
	});
	// <ManagementHeader title={m.adminStats()} fontAwesomeIcon="fa-chart-pie" />
</script>

<div class="grid grid-cols-2 gap-3 md:grid-cols-12">
	<DaysUntil {data} />
	<AppliedChartAndStats {data} />
	<AgeChart {data} />
	<Filter />
	<DistributionChart {data} />
	<RegistrationStats {data} />
	<IndividualRoles {data} />
	<DietMatrix {data} />
	<GenderMatrix {data} />
	<Status {data} />
	<section class="card bg-base-200 col-span-2 shadow-sm md:col-span-12">
		<div class="card-body">
			<h3 class="text-xl font-bold">{m.historyComparison()}</h3>
			<p>{@html m.historyComparisonDescription()}</p>
			<select
				class="select w-full max-w-xs"
				onchange={(e) => setSelectedHistory((e.target as any)?.value)}
			>
				{#each getHistory()?.map((x) => x.timestamp) ?? [] as timestamp}
					<option selected={timestamp === getSelectedHistory()}>
						{timestamp}
					</option>
				{/each}
				{#if getHistory()?.length === 0 || getHistory() === undefined}
					<option selected disabled>{m.noHistory()}</option>
				{/if}
			</select>
		</div>
	</section>
</div>
