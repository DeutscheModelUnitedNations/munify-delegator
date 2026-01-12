<script lang="ts">
	import { MultiSeriesBarChart } from '$lib/components/Charts/ECharts';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from '../$types';

	let props: { data: PageData } = $props();
	let stats = $derived(props.data.stats);

	let showCommitteeAverages = $state(false);

	// Color palette for different categories
	const categoryColors: Record<string, string> = {
		nationDelegates: '#3b82f6', // blue
		nsaParticipants: '#8b5cf6', // violet
		unassignedDelegationMembers: '#6b7280' // gray
	};

	// Colors for roles (single participants)
	const roleColors = ['#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

	// Get color for a category
	const getCategoryColor = (categoryId: string, index: number): string => {
		if (categoryColors[categoryId]) {
			return categoryColors[categoryId];
		}
		// For roles, use the index to pick from roleColors
		return roleColors[index % roleColors.length];
	};

	// Get display name for category
	const getCategoryDisplayName = (categoryId: string, categoryName: string): string => {
		if (categoryId === 'nationDelegates') return m.statsNationDelegates();
		if (categoryId === 'nsaParticipants') return m.statsNSAParticipants();
		if (categoryId === 'unassignedDelegationMembers') return m.statsUnassignedDelegationMembers();
		if (categoryId === 'unassigned') return m.statsUnassigned();
		return categoryName;
	};

	// Build series for stacked chart from new data structure
	const chartSeries = $derived.by(() => {
		if (!stats?.age?.distribution || stats.age.distribution.length === 0) {
			return [];
		}

		const distribution = stats.age.distribution;
		const categories = stats.age.byCategory ?? [];

		// Create a series for each category
		const series: Array<{ name: string; data: number[]; color: string }> = [];

		// Track role index for color assignment
		let roleIndex = 0;

		categories.forEach((category) => {
			const displayName = getCategoryDisplayName(category.categoryId, category.categoryName);
			const colorIndex = category.categoryType === 'singleParticipant' ? roleIndex++ : 0;
			const color = getCategoryColor(category.categoryId, colorIndex);

			series.push({
				name: displayName,
				data: distribution.map(
					(d) => d.byCategory.find((c) => c.categoryId === category.categoryId)?.count ?? 0
				),
				color
			});
		});

		return series;
	});

	// Labels (ages)
	const chartLabels = $derived(stats?.age?.distribution?.map((d) => d.age.toString()) ?? []);

	// Check if we have data
	const hasData = $derived(stats?.age?.distribution && stats.age.distribution.length > 0);

	// Get categories grouped by type for display
	const delegationMemberCategories = $derived(
		stats?.age?.byCategory?.filter((c) => c.categoryType === 'delegationMember') ?? []
	);
	const singleParticipantCategories = $derived(
		stats?.age?.byCategory?.filter((c) => c.categoryType === 'singleParticipant') ?? []
	);
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12">
	<div class="card-body p-4">
		<div class="flex items-center justify-between">
			<h2 class="card-title text-base font-semibold">
				<i class="fa-duotone fa-cake-candles text-base-content/70"></i>
				{m.statsAgeDistribution()}
			</h2>
			{#if stats?.age?.overall?.average !== null && stats?.age?.overall?.average !== undefined}
				<div class="badge badge-primary">
					&#8709; {stats.age.overall.average.toFixed(1)}
					{m.years()}
				</div>
			{/if}
		</div>

		{#if stats?.age?.overall?.missingBirthdays && stats.age.overall.missingBirthdays > 0}
			<div class="alert alert-warning py-2 text-sm">
				<i class="fa-duotone fa-triangle-exclamation"></i>
				<span>{m.statsMissingBirthdays({ count: stats.age.overall.missingBirthdays })}</span>
			</div>
		{/if}

		{#if stats?.age && hasData}
			<!-- Average stats cards by category -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
				{#each delegationMemberCategories as category (category.categoryId)}
					{@const color = getCategoryColor(category.categoryId, 0)}
					{#if category.average !== null}
						<div class="bg-base-100 rounded-lg p-3 text-center">
							<div class="text-xs text-base-content/70">
								{getCategoryDisplayName(category.categoryId, category.categoryName)}
							</div>
							<div class="text-lg font-bold" style="color: {color}">
								{category.average.toFixed(1)}
							</div>
							<div class="text-xs text-base-content/50">n={category.count}</div>
						</div>
					{/if}
				{/each}
				{#each singleParticipantCategories as category, index (category.categoryId)}
					{@const color = getCategoryColor(category.categoryId, index)}
					{#if category.average !== null}
						<div class="bg-base-100 rounded-lg p-3 text-center">
							<div class="text-xs text-base-content/70">
								{getCategoryDisplayName(category.categoryId, category.categoryName)}
							</div>
							<div class="text-lg font-bold" style="color: {color}">
								{category.average.toFixed(1)}
							</div>
							<div class="text-xs text-base-content/50">n={category.count}</div>
						</div>
					{/if}
				{/each}
			</div>

			<!-- Collapsible committee averages -->
			{#if stats.age.byCommittee && stats.age.byCommittee.length > 0}
				<div class="collapse collapse-arrow bg-base-100 mt-3">
					<input type="checkbox" bind:checked={showCommitteeAverages} />
					<div class="collapse-title text-sm font-medium py-2">
						{m.statsCommitteeAverages()}
					</div>
					<div class="collapse-content">
						<div class="grid grid-cols-3 md:grid-cols-6 gap-2 pt-2">
							{#each stats.age.byCommittee as committee (committee.committeeId)}
								{#if committee.average !== null}
									<div class="text-center p-2 bg-base-200 rounded">
										<div class="text-xs text-base-content/70">{committee.abbreviation}</div>
										<div class="font-bold">{committee.average.toFixed(1)}</div>
										<div class="text-xs text-base-content/50">n={committee.count}</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- Stacked bar chart -->
			<div class="mt-3 rounded-lg bg-base-100 p-4">
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
