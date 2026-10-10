<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import PieChart from '$lib/components/charts/echarts/PieChart.svelte';
	import { formatInTimezone } from '$lib/helpers/conferenceTimezoneDate';

	interface Props {
		surveyId: string;
		conferenceId: string;
		conferenceTimezone: string;
		onDelete: (survey: { id: string; title: string }) => void;
	}

	let { surveyId, conferenceId, conferenceTimezone, onDelete }: Props = $props();

	const survey = $derived(
		await client.liveQuery.surveyQuestion({
			__args: { id: surveyId },
			id: true,
			title: true,
			description: true,
			deadline: true,
			draft: true,
			hidden: true,
			showSelectionOnDashboard: true,
			options: {
				id: true,
				title: true,
				countSurveyAnswers: true,
				upperLimit: true
			}
		})
	);

	const totalAnswers = $derived(
		survey.options.reduce((sum, opt) => sum + opt.countSurveyAnswers, 0)
	);

	const chartData = $derived(
		survey.options.map((opt) => ({
			name: opt.title,
			value: opt.countSurveyAnswers
		}))
	);

	const formatDeadline = (date: Date) => {
		return formatInTimezone(date, conferenceTimezone);
	};

	const toggleDraft = async (id: string, currentDraft: boolean) => {
		try {
			await client.mutate.updateSurveyQuestion({
				__args: { id, draft: !currentDraft },
				id: true
			});
		} catch (error) {
			console.error('Failed to toggle draft status:', error);
		}
	};

	const toggleHidden = async (id: string, currentHidden: boolean) => {
		try {
			await client.mutate.updateSurveyQuestion({
				__args: { id, hidden: !currentHidden },
				id: true
			});
		} catch (error) {
			console.error('Failed to toggle hidden status:', error);
		}
	};

	const toggleShowSelection = async (id: string, currentValue: boolean) => {
		try {
			await client.mutate.updateSurveyQuestion({
				__args: { id, showSelectionOnDashboard: !currentValue },
				id: true
			});
		} catch (error) {
			console.error('Failed to toggle showSelectionOnDashboard:', error);
		}
	};
</script>

{#snippet optionStats()}
	<div class="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
		<div class="w-32 shrink-0">
			<PieChart
				data={chartData}
				donut={true}
				showLegend={false}
				showLabels={false}
				height="128px"
			/>
		</div>
		<div class="flex w-full flex-1 flex-col gap-4">
			<dl class="grid grid-cols-2 gap-3">
				<div class="rounded-field bg-base-100/60 px-3 py-2">
					<dt class="flex items-center gap-1.5 text-xs text-base-content/60">
						<i class="fa-sharp-duotone fa-solid fa-clock"></i>
						{m.deadline()}
					</dt>
					<dd class="font-semibold">{formatDeadline(survey.deadline)}</dd>
				</div>
				<div class="rounded-field bg-base-100/60 px-3 py-2">
					<dt class="flex items-center gap-1.5 text-xs text-base-content/60">
						<i class="fa-sharp-duotone fa-solid fa-comments"></i>
						{m.totalAnswers()}
					</dt>
					<dd class="text-lg leading-tight font-bold">{totalAnswers}</dd>
				</div>
			</dl>
			<ul class="flex flex-col gap-2.5">
				{#each survey.options as option (option.id)}
					<li class="flex flex-col gap-1">
						<div class="flex items-baseline justify-between gap-2 text-sm">
							<span class="truncate">{option.title}</span>
							<span class="shrink-0 font-semibold tabular-nums">
								{option.countSurveyAnswers}{#if option.upperLimit > 0}<span
										class="font-normal text-base-content/40">/{option.upperLimit}</span
									>{/if}
							</span>
						</div>
						<progress
							class="progress h-1.5 w-full progress-primary"
							value={option.countSurveyAnswers}
							max={option.upperLimit > 0 ? option.upperLimit : Math.max(totalAnswers, 1)}
						></progress>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/snippet}

<article class="flex w-full flex-col gap-5 rounded-box border border-base-300 bg-base-200/50 p-5">
	<header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
		<div class="flex min-w-0 flex-col gap-2">
			<div class="flex flex-wrap items-center gap-2">
				<h3 class="text-xl font-bold">{survey.title}</h3>
				{#if survey.hidden}
					<span class="badge badge-soft">
						<i class="fa-sharp-duotone fa-solid fa-box-archive"></i>
						{m.archivedSurvey()}
					</span>
				{/if}
			</div>
			<p class="text-sm whitespace-pre-line text-base-content/70">{survey.description}</p>
		</div>
		<div class="flex flex-none flex-wrap gap-2">
			<button class="btn btn-ghost btn-sm" onclick={() => toggleDraft(survey.id, survey.draft)}>
				<i
					class="fa-sharp-duotone fa-solid {survey.draft
						? 'fa-eye-slash text-warning'
						: 'fa-eye text-success'}"
				></i>
				{survey.draft ? m.surveyIsDraft() : m.surveyIsLive()}
			</button>
			<button class="btn btn-ghost btn-sm" onclick={() => toggleHidden(survey.id, survey.hidden)}>
				<i class="fa-sharp-duotone fa-solid fa-box-archive"></i>
				{survey.hidden ? m.unarchiveSurvey() : m.archiveSurvey()}
			</button>
			<button
				class="btn btn-ghost btn-sm text-error"
				onclick={() => onDelete({ id: survey.id, title: survey.title })}
			>
				<i class="fa-sharp-duotone fa-solid fa-trash"></i>
				{m.delete()}
			</button>
		</div>
	</header>

	{#if survey.options.length > 0}
		{@render optionStats()}
	{:else}
		<div
			class="rounded-field border-2 border-dashed border-base-300 p-4 text-center text-sm text-base-content/70"
		>
			{m.noOptionsYet()}
		</div>
	{/if}

	<footer
		class="flex flex-col gap-3 border-t border-base-300 pt-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<label class="flex cursor-pointer flex-wrap items-center gap-2">
			<input
				type="checkbox"
				class="toggle toggle-sm toggle-success"
				checked={survey.showSelectionOnDashboard}
				onchange={() => toggleShowSelection(survey.id, survey.showSelectionOnDashboard)}
			/>
			<span class="text-sm">{m.showSelectionOnDashboard()}</span>
			<span class="text-xs text-base-content/50">({m.showSelectionOnDashboardDescription()})</span>
		</label>
		<a
			class="btn btn-sm btn-primary"
			href={resolve(`/dashboard/${conferenceId}/management/survey/${survey.id}`)}
		>
			{m.details()}
			<i class="fa-sharp-duotone fa-solid fa-arrow-right"></i>
		</a>
	</footer>
</article>
