<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PaperstatusEnum, PapertypeEnum } from '$lib/api/rumbleClient/client';
	import type { EChartsOption, TooltipComponentFormatterCallbackParams } from 'echarts';
	import BarChart from '$lib/components/charts/echarts/BarChart.svelte';
	import MultiSeriesBarChart from '$lib/components/charts/echarts/MultiSeriesBarChart.svelte';
	import GaugeChart from '$lib/components/charts/echarts/GaugeChart.svelte';
	import EChartsBase from '$lib/components/charts/echarts/EChartsBase.svelte';
	import { committeeTooltip, paperTypeChartColors, paperTypeLabel } from './paperStatsCharts';

	interface Paper {
		type: PapertypeEnum;
		status: PaperstatusEnum;
		versions: Array<{ reviews: Array<{ id: string }> }>;
	}

	interface CommitteeWithPapers {
		name: string;
		abbreviation: string;
		papers: Paper[];
	}

	interface Props {
		allPapers: Paper[];
		committeesWithPapers: CommitteeWithPapers[];
	}

	let { allPapers, committeesWithPapers }: Props = $props();

	// Color scheme constants
	const PAPER_STATUS_COLORS = {
		SUBMITTED: '#facc15', // warning/yellow
		REVISED: '#38bdf8', // info/blue
		CHANGES_REQUESTED: '#f87171', // error/red
		ACCEPTED: '#4ade80' // success/green
	} as const;

	// Helper to check if a paper has any reviews
	const paperHasReviews = (paper: Paper): boolean => {
		return paper.versions?.some((v) => v.reviews?.length > 0) ?? false;
	};

	// Detailed statistics
	let detailedStats = $derived.by(() => {
		const withReviews = allPapers.filter((p) => paperHasReviews(p)).length;
		const withoutReviews = allPapers.filter((p) => !paperHasReviews(p)).length;
		const accepted = allPapers.filter((p) => p.status === 'ACCEPTED').length;
		const total = allPapers.length;

		// Acceptance rate excludes drafts
		const nonDraftPapers = allPapers.filter((p) => p.status !== 'DRAFT');
		const acceptanceRate =
			nonDraftPapers.length > 0 ? Math.round((accepted / nonDraftPapers.length) * 100) : 0;

		// Review progress: papers with at least one review
		const reviewProgress = total > 0 ? Math.round((withReviews / total) * 100) : 0;

		return {
			total,
			withReviews,
			withoutReviews,
			accepted,
			acceptanceRate,
			reviewProgress,
			nonDraftCount: nonDraftPapers.length
		};
	});

	// Papers by type chart data
	let papersByTypeData = $derived.by(() => {
		const positionPapers = allPapers.filter((p) => p.type === 'POSITION_PAPER').length;
		const workingPapers = allPapers.filter((p) => p.type === 'WORKING_PAPER').length;
		const introPapers = allPapers.filter((p) => p.type === 'INTRODUCTION_PAPER').length;

		return {
			labels: [
				m.paperTypePositionPaper(),
				m.paperTypeWorkingPaper(),
				m.paperTypeIntroductionPaper()
			],
			values: [positionPapers, workingPapers, introPapers]
		};
	});

	// Status by type (stacked bar) chart data
	let statusByTypeData = $derived.by(() => {
		const statuses: PaperstatusEnum[] = ['SUBMITTED', 'REVISED', 'CHANGES_REQUESTED', 'ACCEPTED'];
		const types: PapertypeEnum[] = ['POSITION_PAPER', 'WORKING_PAPER', 'INTRODUCTION_PAPER'];

		const labels = [
			m.paperStatusSubmitted(),
			m.paperStatusRevised(),
			m.paperStatusChangesRequested(),
			m.paperStatusAccepted()
		];

		const series = types.map((type) => ({
			name: paperTypeLabel(type),
			data: statuses.map(
				(status) => allPapers.filter((p) => p.type === type && p.status === status).length
			),
			color: paperTypeChartColors[type]
		}));

		return { labels, series };
	});

	// Committee breakdown with grouped stacked bar chart
	let committeeChartOptions = $derived.by<EChartsOption>(() => {
		// Sort committees by total paper count descending
		const sortedCommittees = [...committeesWithPapers]
			.map((c) => ({
				...c,
				totalCount: c.papers.length
			}))
			.filter((c) => c.totalCount > 0)
			.sort((a, b) => b.totalCount - a.totalCount);

		// Filter to only committees with position/working papers (exclude NSA with only introduction papers)
		const filteredCommittees = sortedCommittees.filter((c) =>
			c.papers.some((p) => p.type === 'POSITION_PAPER' || p.type === 'WORKING_PAPER')
		);

		const labels = filteredCommittees.map((c) => c.abbreviation);
		const statuses: PaperstatusEnum[] = ['SUBMITTED', 'REVISED', 'CHANGES_REQUESTED', 'ACCEPTED'];
		const types: Array<'POSITION_PAPER' | 'WORKING_PAPER'> = ['POSITION_PAPER', 'WORKING_PAPER'];

		const statusLabels: Record<PaperstatusEnum, string> = {
			DRAFT: m.paperStatusDraft(),
			SUBMITTED: m.paperStatusSubmitted(),
			REVISED: m.paperStatusRevised(),
			CHANGES_REQUESTED: m.paperStatusChangesRequested(),
			ACCEPTED: m.paperStatusAccepted()
		};

		const typeLabels: Record<string, string> = {
			POSITION_PAPER: m.paperTypePositionPaper(),
			WORKING_PAPER: m.paperTypeWorkingPaper()
		};

		// Opacity values to distinguish paper types visually
		const typeOpacity: Record<string, number> = {
			POSITION_PAPER: 1,
			WORKING_PAPER: 0.7
		};

		// Create series for each combination of type and status
		// This creates grouped stacked bars: each paper type stacked separately
		const series = types.flatMap((type) =>
			statuses.map((status) => ({
				name: `${typeLabels[type]} - ${statusLabels[status]}`,
				type: 'bar' as const,
				stack: type, // Group by paper type
				data: filteredCommittees.map(
					(c) => c.papers.filter((p) => p.type === type && p.status === status).length
				),
				itemStyle: {
					color: PAPER_STATUS_COLORS[status],
					opacity: typeOpacity[type]
				},
				label: {
					show: false
				},
				emphasis: {
					focus: 'series' as const
				}
			}))
		);

		return {
			tooltip: {
				trigger: 'axis',
				axisPointer: {
					type: 'shadow'
				},
				formatter: (params: TooltipComponentFormatterCallbackParams) =>
					committeeTooltip(
						params,
						types.map((type) => typeLabels[type])
					)
			},
			legend: {
				bottom: 0,
				type: 'scroll',
				data: [
					// Only show status legend items (not all combinations)
					...statuses.map((status) => ({
						name: `${typeLabels['POSITION_PAPER']} - ${statusLabels[status]}`,
						icon: 'roundRect'
					}))
				],
				formatter: (name: string) => {
					// Show only the status part in legend
					return name.split(' - ')[1] || name;
				},
				selectedMode: false
			},
			grid: {
				left: '3%',
				right: '4%',
				bottom: 60,
				top: 30,
				containLabel: true
			},
			xAxis: {
				type: 'value'
			},
			yAxis: {
				type: 'category',
				data: labels,
				axisLabel: {
					interval: 0
				}
			},
			series
		};
	});

	// Calculate chart height based on number of committees (excluding NSA)
	let committeeChartHeight = $derived(
		`${Math.max(200, committeesWithPapers.filter((c) => c.papers.some((p) => p.type === 'POSITION_PAPER' || p.type === 'WORKING_PAPER')).length * 50)}px`
	);

	// Check if there are any committees with position/working papers to show
	let hasCommitteesToShow = $derived(
		committeesWithPapers.some((c) =>
			c.papers.some((p) => p.type === 'POSITION_PAPER' || p.type === 'WORKING_PAPER')
		)
	);
</script>

<div class="card bg-base-200 border border-base-300 p-4">
	<div class="flex items-center gap-3 mb-4">
		<i class="fa-sharp-duotone fa-solid fa-chart-pie text-primary text-xl"></i>
		<h3 class="font-semibold">{m.statsDetailedPaperStatistics()}</h3>
	</div>

	<!-- Summary Stats Row -->
	<div class="stats stats-vertical sm:stats-horizontal shadow w-full mb-4">
		<div class="stat">
			<div class="stat-figure text-primary">
				<i class="fa-sharp-duotone fa-solid fa-file-lines text-2xl"></i>
			</div>
			<div class="stat-title">{m.statsPaperTotal()}</div>
			<div class="stat-value text-primary">{detailedStats.total}</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-info">
				<i class="fa-sharp-duotone fa-solid fa-comments text-2xl"></i>
			</div>
			<div class="stat-title">{m.statsPapersWithReviews()}</div>
			<div class="stat-value text-info">{detailedStats.withReviews}</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-warning">
				<i class="fa-sharp-duotone fa-solid fa-comment-slash text-2xl"></i>
			</div>
			<div class="stat-title">{m.statsPapersWithoutReviews()}</div>
			<div class="stat-value text-warning">{detailedStats.withoutReviews}</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-success">
				<i class="fa-sharp-duotone fa-solid fa-check-circle text-2xl"></i>
			</div>
			<div class="stat-title">{m.statsAcceptedPapers()}</div>
			<div class="stat-value text-success">{detailedStats.accepted}</div>
		</div>
	</div>

	<!-- Progress Gauges Row -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
		<!-- Review Progress Gauge -->
		<div class="bg-base-100 rounded-box p-4 border border-base-300">
			<h4 class="text-sm font-medium text-center mb-2">{m.statsReviewProgress()}</h4>
			<GaugeChart
				value={detailedStats.reviewProgress}
				name={m.statsPapersWithReviews()}
				height="150px"
			/>
			<p class="text-xs text-center text-base-content/60 mt-1">
				{detailedStats.withReviews} / {detailedStats.total}
			</p>
		</div>

		<!-- Acceptance Rate Gauge -->
		<div class="bg-base-100 rounded-box p-4 border border-base-300">
			<h4 class="text-sm font-medium text-center mb-2">{m.statsAcceptanceRate()}</h4>
			<GaugeChart
				value={detailedStats.acceptanceRate}
				name={m.statsAcceptedPapers()}
				height="150px"
			/>
			<p class="text-xs text-center text-base-content/60 mt-1">
				{detailedStats.accepted} / {detailedStats.nonDraftCount}
			</p>
		</div>
	</div>

	<!-- Paper Statistics Charts (moved from top section) -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
		<!-- Papers by Type -->
		<div class="bg-base-100 rounded-box p-3 border border-base-300">
			<h5 class="text-xs font-medium text-base-content/70 mb-2">{m.statsPapersByType()}</h5>
			<BarChart
				labels={papersByTypeData.labels}
				values={papersByTypeData.values}
				height="180px"
				showValues={true}
			/>
		</div>
		<!-- Status by Type (Stacked) -->
		<div class="bg-base-100 rounded-box p-3 border border-base-300">
			<h5 class="text-xs font-medium text-base-content/70 mb-2">{m.statsPapersByStatus()}</h5>
			<MultiSeriesBarChart
				labels={statusByTypeData.labels}
				series={statusByTypeData.series}
				height="180px"
				stacked={true}
				showValues={true}
				showLegend={true}
			/>
		</div>
	</div>

	<!-- Committee Breakdown (grouped stacked horizontal bar chart) -->
	{#if hasCommitteesToShow}
		<div class="bg-base-100 rounded-box p-3 border border-base-300">
			<h5 class="text-xs font-medium text-base-content/70 mb-2">
				<i class="fa-sharp-duotone fa-solid fa-sitemap mr-2"></i>
				{m.statsPapersByCommittee()}
			</h5>
			<!-- Legend explanation -->
			<div class="flex flex-wrap gap-3 text-xs text-base-content/70 mb-3">
				<span class="flex items-center gap-1">
					<span
						class="inline-block w-3 h-3 rounded-field"
						style="background-color: {PAPER_STATUS_COLORS.SUBMITTED}"
					></span>
					{m.paperStatusSubmitted()}
				</span>
				<span class="flex items-center gap-1">
					<span
						class="inline-block w-3 h-3 rounded-field"
						style="background-color: {PAPER_STATUS_COLORS.REVISED}"
					></span>
					{m.paperStatusRevised()}
				</span>
				<span class="flex items-center gap-1">
					<span
						class="inline-block w-3 h-3 rounded-field"
						style="background-color: {PAPER_STATUS_COLORS.CHANGES_REQUESTED}"
					></span>
					{m.paperStatusChangesRequested()}
				</span>
				<span class="flex items-center gap-1">
					<span
						class="inline-block w-3 h-3 rounded-field"
						style="background-color: {PAPER_STATUS_COLORS.ACCEPTED}"
					></span>
					{m.paperStatusAccepted()}
				</span>
				<span class="text-base-content/50">|</span>
				<span class="flex items-center gap-1">
					<span class="inline-block w-3 h-3 rounded-field bg-base-content"></span>
					{m.paperTypePositionPaper()}
				</span>
				<span class="flex items-center gap-1">
					<span class="inline-block w-3 h-3 rounded-field bg-base-content/70"></span>
					{m.paperTypeWorkingPaper()}
				</span>
			</div>
			<EChartsBase options={committeeChartOptions} height={committeeChartHeight} notMerge={true} />
		</div>
	{/if}
</div>
