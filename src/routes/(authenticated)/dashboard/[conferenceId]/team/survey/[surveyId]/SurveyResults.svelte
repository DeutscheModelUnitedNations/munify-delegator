<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import PieChart from '$lib/components/charts/echarts/PieChart.svelte';
	import BarChart from '$lib/components/charts/echarts/BarChart.svelte';
	import GaugeChart from '$lib/components/charts/echarts/GaugeChart.svelte';
	import LineChart from '$lib/components/charts/echarts/LineChart.svelte';
	import CollapsibleParticipantList from '$lib/components/CollapsibleParticipantList.svelte';
	import SurveyExportButtons from './SurveyExportButtons.svelte';
	import { fetchSurveyResults } from './surveyAnswers';
	import { compareByDisplayName } from './surveyExport';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		conferenceId: string;
		surveyId: string;
	}

	let { conferenceId, surveyId }: Props = $props();

	const results = $derived(await fetchSurveyResults(conferenceId, surveyId));
	const survey = $derived(results.survey);
	const notAnsweredParticipants = $derived(results.usersNotAnswered);

	// Chart data
	let pieChartData = $derived(
		survey.options.map((o) => ({ name: o.title, value: o.countSurveyAnswers }))
	);
	let chartLabels = $derived(survey.options.map((o) => o.title));
	let chartValues = $derived(survey.options.map((o) => o.countSurveyAnswers));
	let totalAnswers = $derived(survey.surveyAnswers.length);
	let totalEligible = $derived(totalAnswers + notAnsweredParticipants.length);
	let participationRate = $derived(
		totalEligible > 0 ? Math.round((totalAnswers / totalEligible) * 100) : 0
	);

	// Timeline chart data - cumulative answers over time per option
	let timelineData = $derived.by(() => {
		if (!survey.surveyAnswers.length || !survey.options.length) {
			return { xAxisData: [] as string[], series: [] as { name: string; data: number[] }[] };
		}

		// Get all unique dates and sort them
		const dateSet = new SvelteSet<string>();
		for (const answer of survey.surveyAnswers) {
			const date = new Date(answer.createdAt).toLocaleDateString();
			dateSet.add(date);
		}
		const sortedDates = [...dateSet].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

		// Build cumulative counts per option per date
		const series = survey.options.map((option) => {
			let cumulative = 0;
			const data = sortedDates.map((date) => {
				const answersOnDate = survey.surveyAnswers.filter(
					(a) => a.option.id === option.id && new Date(a.createdAt).toLocaleDateString() === date
				).length;
				cumulative += answersOnDate;
				return cumulative;
			});
			return { name: option.title, data };
		});

		return { xAxisData: sortedDates, series };
	});

	const getParticipantsForOption = (optionId: string) => {
		return survey.surveyAnswers
			.filter((answer) => answer.option.id === optionId)
			.map((answer) => answer.user)
			.sort(compareByDisplayName);
	};
</script>

<!-- Charts Section -->
<div class="grid gap-4 lg:grid-cols-3">
	<!-- Participation Gauge -->
	<div class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body">
			<h3 class="card-title text-base">{m.participation()}</h3>
			<GaugeChart value={participationRate} name={m.participantsAnswered()} height="160px" />
			<p class="text-center text-sm opacity-70">
				{totalAnswers} / {totalEligible}
			</p>
		</div>
	</div>

	<!-- Distribution Donut -->
	<div class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body">
			<h3 class="card-title text-base">{m.distribution()}</h3>
			{#if pieChartData.length > 0 && pieChartData.some((d) => d.value > 0)}
				<PieChart data={pieChartData} donut={true} showLegend={true} height="200px" />
			{:else}
				<div class="flex h-48 items-center justify-center text-sm opacity-50">
					{m.noDataYet()}
				</div>
			{/if}
		</div>
	</div>

	<!-- Bar Comparison -->
	<div class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body">
			<h3 class="card-title text-base">{m.optionComparison()}</h3>
			{#if chartValues.length > 0 && chartValues.some((v) => v > 0)}
				<BarChart labels={chartLabels} values={chartValues} showValues={true} height="200px" />
			{:else}
				<div class="flex h-48 items-center justify-center text-sm opacity-50">
					{m.noDataYet()}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Timeline Chart -->
<div class="card bg-base-100 border-base-200 border shadow-sm">
	<div class="card-body">
		<h3 class="card-title text-base">{m.answersOverTime()}</h3>
		{#if timelineData.xAxisData.length > 0}
			<LineChart
				xAxisData={timelineData.xAxisData}
				series={timelineData.series}
				showLegend={true}
				smooth={true}
				height="250px"
			/>
		{:else}
			<div class="flex h-48 items-center justify-center text-sm opacity-50">
				{m.noDataYet()}
			</div>
		{/if}
	</div>
</div>

<!-- Participant Lists -->
<div class="flex flex-col gap-3">
	<h3 class="text-lg font-bold">{m.answers()}</h3>
	{#each survey.options as option (option.id)}
		{@const participants = getParticipantsForOption(option.id)}
		<CollapsibleParticipantList
			title={option.title}
			description={option.description}
			count={option.countSurveyAnswers}
			limit={option.upperLimit}
			{participants}
		/>
	{/each}

	<CollapsibleParticipantList
		title={m.notAssignedParticipants()}
		count={notAnsweredParticipants.length}
		participants={notAnsweredParticipants}
	/>
</div>

<!-- Export Section -->
<section class="flex flex-col gap-4 rounded-box border border-base-300 bg-base-200/50 p-5">
	<header class="flex items-center gap-3">
		<div class="flex size-10 flex-none items-center justify-center rounded-field bg-primary/15">
			<i class="fa-sharp-duotone fa-solid fa-file-export text-xl text-primary"></i>
		</div>
		<div>
			<h3 class="text-lg font-bold">{m.surveyExports()}</h3>
			<p class="text-sm text-base-content/60">{m.surveyExportsDescription()}</p>
		</div>
	</header>
	<div class="border-t border-base-300 pt-4">
		<SurveyExportButtons {surveyId} {conferenceId} />
	</div>
</section>
