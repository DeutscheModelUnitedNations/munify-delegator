<script lang="ts">
	import IndividualRoles from './Widgets/IndividualRoles.svelte';

	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import * as m from '$lib/paraglide/messages';
	import { onMount } from 'svelte';
	import {
		getHistory,
		getSelectedHistory,
		getStats,
		registrationFilter,
		setHistory,
		setSelectedHistory,
		type StatsTypeHistoryEntry
	} from './stats.svelte';
	import AgeChart from './Widgets/AgeChart.svelte';
	import AppliedChartAndStats from './Widgets/AppliedChartAndStats.svelte';
	import DaysUntil from './Widgets/DaysUntil.svelte';
	import DistributionChart from './Widgets/DistributionChart.svelte';
	import Filter from './Widgets/Filter.svelte';
	import RegistrationStats from './Widgets/RegistrationStats.svelte';
	import { format } from 'date-fns';
	let { data } = $props();

	let stats = getStats();

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
			stats
		) {
			history.unshift({
				stats,
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
</script>

<ManagementHeader title={m.adminStats()} fontAwesomeIcon="fa-chart-pie" />

<div class="grid grid-cols-2 md:grid-cols-12 mt-10 gap-10">
	<DaysUntil />
	<AppliedChartAndStats />
	<AgeChart />
	<Filter />
	<DistributionChart />
	<RegistrationStats />
	<IndividualRoles />
	<section class="col-span-2 md:col-span-12 card bg-base-200 shadow-sm">
		<div class="card-body">
			<h3 class="text-xl font-bold">{m.historyComparison()}</h3>
			<p>{@html m.historyComparisonDescription()}</p>
			<select
				class="select select-bordered w-full max-w-xs"
				onchange={(e) => setSelectedHistory(e.target.value)}
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
