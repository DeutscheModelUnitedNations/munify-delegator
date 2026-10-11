<script lang="ts">
	import { MultiSeriesBarChart } from '$lib/components/charts/echarts';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { statsQueryFilter } from '../stats.svelte';
	import { ageChartSeries, getCategoryColor, getCategoryDisplayName } from './chartData';

	let { conferenceId }: { conferenceId: string } = $props();

	const stats = $derived(
		await client.query.getConferenceStatistics({
			__args: { conferenceId, filter: statsQueryFilter() },
			age: {
				overall: { average: true, missingBirthdays: true },
				distribution: { age: true, byCategory: { categoryId: true, count: true } },
				byCategory: {
					categoryId: true,
					categoryName: true,
					categoryType: true,
					count: true,
					average: true
				},
				byCommittee: {
					committeeId: true,
					abbreviation: true,
					count: true,
					average: true
				}
			}
		})
	);

	let showCommitteeAverages = $state(false);

	// Build series for stacked chart from new data structure
	const age = $derived(stats?.age);
	const chartSeries = $derived(ageChartSeries(age));

	// Labels (ages)
	const chartLabels = $derived(stats?.age?.distribution?.map((d) => d.age.toString()) ?? []);

	// Check if we have data
	const hasData = $derived(stats?.age?.distribution && stats.age.distribution.length > 0);

	/** One average card per category with an average: delegation members first, then roles. */
	const averageCards = $derived.by(() => {
		const categories = stats?.age?.byCategory ?? [];
		const delegationMemberCategories = categories
			.filter((c) => c.categoryType === 'delegationMember')
			.map((category) => ({ category, color: getCategoryColor(category.categoryId, 0) }));
		const singleParticipantCategories = categories
			.filter((c) => c.categoryType === 'singleParticipant')
			.map((category, index) => ({
				category,
				color: getCategoryColor(category.categoryId, index)
			}));
		return [...delegationMemberCategories, ...singleParticipantCategories].flatMap(
			({ category, color }) =>
				category.average !== null
					? [
							{
								id: category.categoryId,
								label: getCategoryDisplayName(category.categoryId, category.categoryName),
								average: category.average,
								count: category.count,
								color
							}
						]
					: []
		);
	});

	const committeeAverages = $derived(
		(stats?.age?.byCommittee ?? []).flatMap((committee) =>
			committee.average !== null
				? [
						{
							committeeId: committee.committeeId,
							abbreviation: committee.abbreviation,
							count: committee.count,
							average: committee.average
						}
					]
				: []
		)
	);
	const hasCommittees = $derived((stats?.age?.byCommittee?.length ?? 0) > 0);

	const averageAge = $derived(stats?.age?.overall?.average ?? null);
	const missingBirthdays = $derived(stats?.age?.overall?.missingBirthdays ?? 0);
</script>

{#snippet committeeAverageList()}
	<div class="collapse collapse-arrow border border-base-300 mt-3">
		<input type="checkbox" bind:checked={showCommitteeAverages} />
		<div class="collapse-title text-sm font-medium py-2">
			{m.statsCommitteeAverages()}
		</div>
		<div class="collapse-content">
			<div class="grid grid-cols-3 md:grid-cols-6 gap-2 pt-2">
				{#each committeeAverages as committee (committee.committeeId)}
					<div class="text-center p-2 bg-base-200 rounded-field">
						<div class="text-xs text-base-content/70">{committee.abbreviation}</div>
						<div class="font-bold">{committee.average.toFixed(1)}</div>
						<div class="text-xs text-base-content/50">n={committee.count}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/snippet}

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12">
	<div class="card-body p-4">
		<div class="flex items-center justify-between">
			<h2 class="card-title text-base font-semibold">
				<i class="fa-sharp-duotone fa-solid fa-cake-candles text-base-content/70"></i>
				{m.statsAgeDistribution()}
			</h2>
			{#if averageAge !== null}
				<div class="badge badge-primary">
					&#8709; {averageAge.toFixed(1)}
					{m.years()}
				</div>
			{/if}
		</div>

		{#if missingBirthdays > 0}
			<div class="alert alert-warning py-2 text-sm">
				<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
				<span>{m.statsMissingBirthdays({ count: missingBirthdays })}</span>
			</div>
		{/if}

		{#if stats?.age && hasData}
			<!-- Average stats cards by category -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
				{#each averageCards as card (card.id)}
					<div class="text-center">
						<div class="text-xs text-base-content/70">
							{card.label}
						</div>
						<div class="text-lg font-bold" style="color: {card.color}">
							{card.average.toFixed(1)}
						</div>
						<div class="text-xs text-base-content/50">n={card.count}</div>
					</div>
				{/each}
			</div>

			<!-- Collapsible committee averages -->
			{#if hasCommittees}
				{@render committeeAverageList()}
			{/if}

			<!-- Stacked bar chart -->
			<div class="mt-3">
				<MultiSeriesBarChart
					labels={chartLabels}
					series={chartSeries}
					height="300px"
					yAxisName={m.statsParticipants()}
					xAxisName={m.years()}
					stacked={true}
					showLegend={true}
				/>
			</div>
		{:else}
			<p class="text-base-content/70">{m.noDataAvailable()}</p>
		{/if}
	</div>
</section>
