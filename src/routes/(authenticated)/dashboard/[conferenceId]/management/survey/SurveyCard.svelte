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
	<div class="flex items-start gap-4">
		<div class="w-28 shrink-0">
			<PieChart
				data={chartData}
				donut={true}
				showLegend={false}
				showLabels={false}
				height="112px"
			/>
		</div>
		<div class="flex flex-1 flex-col gap-2 overflow-hidden">
			<!-- Summary stats table -->
			<div class="bg-base-300 overflow-hidden rounded-t-box">
				<table class="table table-sm">
					<tbody>
						<tr class="border-base-200">
							<td class="font-medium">{m.deadline()}</td>
							<td class="text-right font-medium">{formatDeadline(survey.deadline)}</td>
						</tr>
						<tr class="border-base-200 border-b-0">
							<td class="font-medium">{m.totalAnswers()}</td>
							<td class="text-right font-medium">{totalAnswers}</td>
						</tr>
					</tbody>
				</table>
			</div>
			<!-- Per-option stats table -->
			<div class="bg-base-300 overflow-hidden rounded-b-box">
				<table class="table table-sm">
					<tbody>
						{#each survey.options as option, i (option.id)}
							<tr class="border-base-200" class:border-b-0={i === survey.options.length - 1}>
								<td class="text-base-content/60 truncate text-xs">{option.title}</td>
								<td class="text-base-content/60 text-right text-xs">
									{option.countSurveyAnswers}{#if option.upperLimit > 0}<span
											class="text-base-content/40">/{option.upperLimit}</span
										>{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
{/snippet}

<div class="bg-base-200 flex w-full flex-col gap-4 rounded-box p-4">
	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{survey.title}</h3>
		<div class="flex flex-wrap items-center gap-2">
			{#if survey.draft}
				<span class="badge badge-warning w-fit">{m.surveyIsDraft()}</span>
			{:else}
				<span class="badge badge-success w-fit">{m.surveyIsLive()}</span>
			{/if}
			{#if survey.hidden}
				<span class="badge badge-neutral w-fit">
					<i class="fa-sharp-duotone fa-solid fa-box-archive mr-1"></i>
					{m.archivedSurvey()}
				</span>
			{/if}
		</div>
		<p class="whitespace-pre-line text-sm opacity-70">{survey.description}</p>
		<div class="flex flex-wrap gap-2">
			<button
				class="btn btn-sm {survey.draft ? 'btn-success' : 'btn-warning'}"
				onclick={() => toggleDraft(survey.id, survey.draft)}
			>
				<i class="fas {survey.draft ? 'fa-eye' : 'fa-eye-slash'}"></i>
				{survey.draft ? m.publishSurvey() : m.unpublishSurvey()}
			</button>
			<button class="btn btn-ghost btn-sm" onclick={() => toggleHidden(survey.id, survey.hidden)}>
				<i class="fa-sharp-duotone fa-solid fa-box-archive"></i>
				{survey.hidden ? m.unarchiveSurvey() : m.archiveSurvey()}
			</button>
			<a
				href={resolve(`/dashboard/${conferenceId}/management/survey/${survey.id}`)}
				class="btn btn-sm"
			>
				<i class="fas fa-edit"></i>
				{m.edit()}
			</a>
			<button
				class="btn btn-error btn-sm"
				onclick={() => onDelete({ id: survey.id, title: survey.title })}
			>
				<i class="fas fa-trash"></i>
				{m.delete()}
			</button>
		</div>

		<!-- Toggle switches -->
		<div class="mt-2 flex flex-col gap-2">
			<label class="flex cursor-pointer items-center gap-2">
				<input
					type="checkbox"
					class="toggle toggle-success toggle-sm"
					checked={survey.showSelectionOnDashboard}
					onchange={() => toggleShowSelection(survey.id, survey.showSelectionOnDashboard)}
				/>
				<span class="text-sm">{m.showSelectionOnDashboard()}</span>
				<span class="text-base-content/50 text-xs">({m.showSelectionOnDashboardDescription()})</span
				>
			</label>
		</div>
	</div>

	{#if survey.options.length > 0}
		{@render optionStats()}
	{:else}
		<div class="bg-base-300 rounded-field p-4 text-center text-sm opacity-70">
			{m.noOptionsYet()}
		</div>
	{/if}

	<a
		class="btn btn-primary"
		href={resolve(`/dashboard/${conferenceId}/management/survey/${survey.id}`)}
	>
		{m.details()}
	</a>
</div>
