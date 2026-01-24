<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import DaysUntil from './widgets/DaysUntil.svelte';
	import type { PageData } from './$types';
	import AppliedChartAndStats from './widgets/AppliedChartAndStats.svelte';
	import AgeChart from './widgets/AgeChart.svelte';
	import Filter from './widgets/Filter.svelte';
	import DistributionChart from './widgets/DistributionChart.svelte';
	import IndividualRoles from './widgets/IndividualRoles.svelte';
	import { format } from 'date-fns';
	import { onMount } from 'svelte';
	import {
		getHistory,
		getSelectedHistory,
		setHistory,
		setSelectedHistory,
		unifiedFilter,
		mapFilterToGraphQL,
		type StatsTypeHistoryEntry
	} from './stats.svelte';
	import DietMatrix from './widgets/DietMatrix.svelte';
	import GenderMatrix from './widgets/GenderMatrix.svelte';
	import Maps from './widgets/Maps.svelte';
	import RoleStats from './widgets/RoleStats.svelte';
	import CommitteeFillRates from './widgets/CommitteeFillRates.svelte';
	import RegistrationTimeline from './widgets/RegistrationTimeline.svelte';
	import NationalityChart from './widgets/NationalityChart.svelte';
	import SchoolStats from './widgets/SchoolStats.svelte';
	import WaitingListStats from './widgets/WaitingListStats.svelte';
	import SupervisorStats from './widgets/SupervisorStats.svelte';
	import PostalPaymentProgress from './widgets/PostalPaymentProgress.svelte';
	import PaperStats from './widgets/PaperStats.svelte';
	import { statsQuery } from './statsQuery';

	let { data }: { data: PageData } = $props();

	// Filter state and reactive data
	let { getFilter } = unifiedFilter();
	let isLoading = $state(false);
	let statsData = $state(data.stats);
	let lastFilter = $state<string>('ALL');

	// Refetch stats when filter changes
	$effect(() => {
		const currentFilter = getFilter();
		const graphqlFilter = mapFilterToGraphQL(currentFilter);

		// Skip if filter hasn't changed
		if (graphqlFilter === lastFilter) {
			return;
		}

		lastFilter = graphqlFilter;

		// Use cached initial data for ALL filter
		if (graphqlFilter === 'ALL') {
			statsData = data.stats;
			return;
		}

		isLoading = true;
		statsQuery
			.fetch({
				variables: {
					conferenceID: data.conferenceId,
					filter: graphqlFilter
				}
			})
			.then((result) => {
				if (result.data?.getConferenceStatistics) {
					statsData = result.data.getConferenceStatistics;
				}
			})
			.catch((error) => {
				console.error('Failed to fetch statistics:', error);
				// Fall back to initial data on error
				statsData = data.stats;
			})
			.finally(() => {
				isLoading = false;
			});
	});

	// Create reactive data object for widgets
	let reactiveData = $derived({
		...data,
		stats: statsData
	});

	onMount(() => {
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

		setHistory(history.filter((x) => x.conferenceId === data.conferenceId));
		setSelectedHistory(
			history.find((x) => x.timestamp !== format(Date.now(), 'yyyy-MM-dd'))?.timestamp
		);
	});
</script>

{#if !data.stats}
	<div class="flex flex-col items-center justify-center gap-4 py-16">
		<i class="fa-duotone fa-chart-simple text-6xl text-base-content/30"></i>
		<p class="text-base-content/70">{m.noStatsAvailable()}</p>
	</div>
{:else}
	<div class="grid grid-cols-2 gap-3 md:grid-cols-12 relative">
		<!-- Loading overlay -->
		{#if isLoading}
			<div class="absolute inset-0 bg-base-100/50 z-10 flex items-center justify-center rounded-lg">
				<span class="loading loading-spinner loading-lg text-primary"></span>
			</div>
		{/if}

		<Filter />
		<DaysUntil data={reactiveData} />

		<AppliedChartAndStats stats={data.stats} />

		{#if reactiveData.stats.roleBased}
			<RoleStats roleBased={reactiveData.stats.roleBased} />
		{/if}

		{#if data.stats.supervisorStats}
			<SupervisorStats supervisorStats={data.stats.supervisorStats} />
		{/if}
		{#if reactiveData.stats.waitingList}
			<WaitingListStats data={reactiveData} />
		{/if}
		<DistributionChart data={reactiveData} />

		<IndividualRoles data={reactiveData} />

		{#if data.stats.postalPaymentProgress}
			<PostalPaymentProgress progress={data.stats.postalPaymentProgress} />
		{/if}

		{#if reactiveData.stats.committeeFillRates && reactiveData.stats.committeeFillRates.length > 0}
			<CommitteeFillRates committeeFillRates={reactiveData.stats.committeeFillRates} />
		{/if}

		{#if data.stats.paperStats && data.stats.paperStats.total > 0}
			<PaperStats paperStats={data.stats.paperStats} />
		{/if}

		{#if reactiveData.stats.registrationTimeline && reactiveData.stats.registrationTimeline.length > 0}
			<RegistrationTimeline registrationTimeline={reactiveData.stats.registrationTimeline} />
		{/if}

		<AgeChart data={reactiveData} />

		{#if reactiveData.stats.nationalityDistribution && reactiveData.stats.nationalityDistribution.length > 0}
			<NationalityChart nationalityDistribution={reactiveData.stats.nationalityDistribution} />
		{/if}
		{#if reactiveData.stats.schoolStats && reactiveData.stats.schoolStats.length > 0}
			<SchoolStats schoolStats={reactiveData.stats.schoolStats} />
		{/if}

		<!-- Row 9: Diet and Gender Matrix -->
		<DietMatrix data={reactiveData} />
		<GenderMatrix data={reactiveData} />

		<!-- Row 10: Map -->
		<Maps addresses={reactiveData.stats.addresses} />

		<!-- Row 11: History Comparison (Full width) -->
		<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12">
			<div class="card-body p-4">
				<h2 class="card-title text-base font-semibold">
					<i class="fa-duotone fa-clock-rotate-left text-base-content/70"></i>
					{m.historyComparison()}
				</h2>
				<p class="text-sm text-base-content/70">{@html m.historyComparisonDescription()}</p>
				<select
					class="select select-bordered w-full max-w-xs bg-base-100"
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
{/if}
