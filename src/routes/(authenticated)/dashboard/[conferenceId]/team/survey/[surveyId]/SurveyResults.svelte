<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';
	import PieChart from '#lib/components/charts/echarts/PieChart.svelte';
	import BarChart from '#lib/components/charts/echarts/BarChart.svelte';
	import GaugeChart from '#lib/components/charts/echarts/GaugeChart.svelte';
	import LineChart from '#lib/components/charts/echarts/LineChart.svelte';
	import CollapsibleParticipantList from '#lib/components/CollapsibleParticipantList.svelte';
	import SurveyExportButtons from './SurveyExportButtons.svelte';
	import { fetchSurveyResults } from './surveyAnswers';
	import { compareByDisplayName } from './surveyExport';
	import { SvelteSet } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client.js';
	import ActionModal from '#lib/components/ActionModal.svelte';
	import { saveWithToast } from '#lib/helpers/saveWithToast.js';
	import type { Snippet } from 'svelte';

	interface Props {
		conferenceId: string;
		surveyId: string;
	}

	let { conferenceId, surveyId }: Props = $props();

	const results = $derived(await fetchSurveyResults(conferenceId, surveyId));
	const survey = $derived(results.survey);
	const notAnsweredParticipants = $derived(results.usersNotAnswered);

	/** Seats still free across the options; an option without a limit never runs out. */
	const freeSeats = $derived(
		survey.options.reduce(
			(sum, o) =>
				sum + (o.upperLimit ? Math.max(0, o.upperLimit - o.countSurveyAnswers) : Infinity),
			0
		)
	);
	const leftOver = $derived(Math.max(0, notAnsweredParticipants.length - freeSeats));

	let distributeOpen = $state(false);
	let distributing = $state(false);

	async function distribute() {
		const done = await saveWithToast(
			(loading) => (distributing = loading),
			async () => {
				const assigned = await client.mutate.distributeUnansweredSurvey({
					__args: { questionId: surveyId }
				});
				toast.success(m.surveyDistributeDone({ count: assigned }));
			}
		);
		if (done) distributeOpen = false;
	}

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
			const date = new Date(answer.createdAt).toLocaleDateString(getLocale());
			dateSet.add(date);
		}
		const sortedDates = [...dateSet].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

		// Build cumulative counts per option per date
		const series = survey.options.map((option) => {
			let cumulative = 0;
			const data = sortedDates.map((date) => {
				const answersOnDate = survey.surveyAnswers.filter(
					(a) =>
						a.option.id === option.id &&
						new Date(a.createdAt).toLocaleDateString(getLocale()) === date
				).length;
				cumulative += answersOnDate;
				return cumulative;
			});
			return { name: option.title, data };
		});

		return { xAxisData: sortedDates, series };
	});

	const hasAnswers = $derived(chartValues.some((v) => v > 0));
	const canDistribute = $derived(notAnsweredParticipants.length > 0 && survey.options.length > 0);

	const getParticipantsForOption = (optionId: string) => {
		return survey.surveyAnswers
			.filter((answer) => answer.option.id === optionId)
			.map((answer) => answer.user)
			.sort(compareByDisplayName);
	};
</script>

<!-- A chart in a card of its own, with a placeholder until there is something to draw -->
{#snippet chartCard(title: string, hasData: boolean, chart: Snippet)}
	<div class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body">
			<h3 class="card-title text-base">{title}</h3>
			{#if hasData}
				{@render chart()}
			{:else}
				<div class="flex h-48 items-center justify-center text-sm opacity-50">
					{m.noDataYet()}
				</div>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet pieChart()}
	<PieChart data={pieChartData} donut={true} showLegend={true} height="200px" />
{/snippet}

{#snippet barChart()}
	<BarChart labels={chartLabels} values={chartValues} showValues={true} height="200px" />
{/snippet}

{#snippet lineChart()}
	<LineChart
		xAxisData={timelineData.xAxisData}
		series={timelineData.series}
		showLegend={true}
		smooth={true}
		height="250px"
	/>
{/snippet}

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

	{@render chartCard(m.distribution(), hasAnswers, pieChart)}
	{@render chartCard(m.optionComparison(), hasAnswers, barChart)}
</div>

{@render chartCard(m.answersOverTime(), timelineData.xAxisData.length > 0, lineChart)}

<!-- Participant Lists -->
<div class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h3 class="text-lg font-bold">{m.answers()}</h3>
		{#if canDistribute}
			<button
				class="btn btn-sm"
				disabled={freeSeats === 0}
				title={freeSeats === 0 ? m.surveyDistributeNoRoom() : undefined}
				onclick={() => (distributeOpen = true)}
			>
				<i class="fa-sharp-duotone fa-solid fa-shuffle"></i>
				{m.surveyDistribute()}
			</button>
		{/if}
	</div>
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

{#if distributeOpen}
	<ActionModal
		title={m.surveyDistribute()}
		confirmLabel={m.surveyDistributeConfirm()}
		loading={distributing}
		onConfirm={distribute}
		onClose={() => (distributeOpen = false)}
	>
		<p>{m.surveyDistributeDescription({ count: notAnsweredParticipants.length })}</p>
		{#if leftOver > 0}
			<div class="alert alert-warning">
				<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
				{m.surveyDistributeLeftOver({ count: leftOver })}
			</div>
		{/if}
	</ActionModal>
{/if}
