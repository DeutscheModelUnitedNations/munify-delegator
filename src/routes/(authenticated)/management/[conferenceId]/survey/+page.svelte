<script lang="ts">
	import type { SurveyResultsMainPage$result } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms';
	import StackChart from '$lib/components/Charts/StackChart.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let surveys = $derived(data.surveys);

	// Create survey form
	const createForm = superForm(data.createSurveyForm, {
		onResult: async () => {
			await invalidateAll();
			showCreateModal = false;
		}
	});
	const { form: createFormData, enhance: createEnhance } = createForm;

	// Delete survey form
	const deleteForm = superForm(data.deleteSurveyForm, {
		onResult: async () => {
			await invalidateAll();
			showDeleteModal = false;
			surveyToDelete = null;
		}
	});
	const { enhance: deleteEnhance } = deleteForm;

	let showCreateModal = $state(false);
	let showDeleteModal = $state(false);
	let surveyToDelete = $state<(typeof surveys)[0] | null>(null);

	const getBarPercent = (
		option: SurveyResultsMainPage$result['findManySurveyQuestions'][0]['options'][0]
	) => {
		if (option.upperLimit === 0) {
			return 0;
		}
		return Math.min(Math.round((option.countSurveyAnswers / option.upperLimit) * 100), 100);
	};

	const getTotalAnswers = (survey: (typeof surveys)[0]) => {
		return survey.options.reduce((sum, opt) => sum + opt.countSurveyAnswers, 0);
	};

	const getChartValues = (survey: (typeof surveys)[0]) => {
		return survey.options.map((opt) => opt.countSurveyAnswers);
	};

	const getChartLabels = (survey: (typeof surveys)[0]) => {
		return survey.options.map((opt) => opt.title);
	};

	const confirmDelete = (survey: (typeof surveys)[0]) => {
		surveyToDelete = survey;
		showDeleteModal = true;
	};

	const formatDeadline = (date: Date) => {
		return date.toLocaleString();
	};
</script>

<div class="flex flex-col gap-8 p-10">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<h2 class="text-2xl font-bold">{m.survey()}</h2>
		<button class="btn btn-primary" onclick={() => (showCreateModal = true)}>
			<i class="fas fa-plus"></i>
			{m.createSurvey()}
		</button>
	</div>

	{#if surveys.length === 0}
		<div class="bg-base-200 flex flex-col items-center justify-center rounded-lg p-12">
			<i class="fas fa-chart-pie text-5xl opacity-50"></i>
			<p class="mt-4 text-lg opacity-70">{m.noSurveysYet()}</p>
			<button class="btn btn-primary mt-4" onclick={() => (showCreateModal = true)}>
				<i class="fas fa-plus"></i>
				{m.createSurvey()}
			</button>
		</div>
	{:else}
		{#each surveys as survey}
			<div class="bg-base-200 flex w-full flex-col gap-4 rounded-lg p-4">
				<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2">
							<h3 class="text-xl font-bold">{survey.title}</h3>
							{#if survey.draft}
								<span class="badge badge-warning">{m.surveyIsDraft()}</span>
							{:else}
								<span class="badge badge-success">{m.surveyIsLive()}</span>
							{/if}
						</div>
						<p class="text-sm opacity-70">{survey.description}</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<form method="POST" action="?/toggleDraft">
							<input type="hidden" name="id" value={survey.id} />
							<input type="hidden" name="draft" value={survey.draft.toString()} />
							<button
								type="submit"
								class="btn btn-sm {survey.draft ? 'btn-success' : 'btn-warning'}"
							>
								<i class="fas {survey.draft ? 'fa-eye' : 'fa-eye-slash'}"></i>
								{survey.draft ? m.publishSurvey() : m.unpublishSurvey()}
							</button>
						</form>
						<a href="/management/{data.conferenceId}/survey/{survey.id}" class="btn btn-sm">
							<i class="fas fa-edit"></i>
							{m.edit()}
						</a>
						<button class="btn btn-error btn-sm" onclick={() => confirmDelete(survey)}>
							<i class="fas fa-trash"></i>
							{m.delete()}
						</button>
					</div>
				</div>

				<div class="grid grid-cols-[auto,1fr] items-center gap-2 text-sm">
					<i class="fa-duotone fa-alarm-clock place-self-center"></i>
					<p>{formatDeadline(survey.deadline)}</p>
					<i class="fa-duotone fa-users place-self-center"></i>
					<p>
						{getTotalAnswers(survey)}
						{m.answers()}
					</p>
				</div>

				{#if survey.options.length > 0}
					<div class="bg-base-300 rounded-lg p-2">
						<StackChart
							values={getChartValues(survey)}
							labels={getChartLabels(survey)}
							percentage={true}
						/>
					</div>

					<div class="flex flex-col gap-2">
						{#each survey.options as option}
							<div class="relative flex w-full gap-2 p-2">
								<div
									class="absolute top-0 bottom-0 left-0 z-0 flex rounded-md {getBarPercent(
										option
									) === 100
										? 'bg-red-200 dark:bg-red-900'
										: 'bg-primary-200 dark:bg-primary-900'}"
									style="width: {getBarPercent(option)}%"
								></div>
								<h4 class="z-10 w-full flex-1">{option.title}</h4>
								<h4 class="z-10">
									<span class="font-bold">{option.countSurveyAnswers}</span>
									{#if option.upperLimit > 0}
										&nbsp;/&nbsp;
										<span class="text-xs">{option.upperLimit}</span>
									{/if}
								</h4>
							</div>
						{/each}
					</div>
				{:else}
					<div class="bg-base-300 rounded p-4 text-center text-sm opacity-70">
						{m.noOptionsYet()}
					</div>
				{/if}

				<a class="btn btn-primary" href="/management/{data.conferenceId}/survey/{survey.id}">
					{m.details()}
				</a>
			</div>
		{/each}
	{/if}
</div>

<!-- Create Survey Modal -->
{#if showCreateModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.createSurvey()}</h3>
			<form
				method="POST"
				action="?/createSurvey"
				use:createEnhance
				class="mt-4 flex flex-col gap-4"
			>
				<div class="form-control">
					<label class="label" for="title">
						<span class="label-text">{m.title()}</span>
					</label>
					<input
						type="text"
						id="title"
						name="title"
						bind:value={$createFormData.title}
						class="input input-bordered"
						required
					/>
				</div>
				<div class="form-control">
					<label class="label" for="description">
						<span class="label-text">{m.description()}</span>
					</label>
					<textarea
						id="description"
						name="description"
						bind:value={$createFormData.description}
						class="textarea textarea-bordered"
						required
					></textarea>
				</div>
				<div class="form-control">
					<label class="label" for="deadline">
						<span class="label-text">{m.deadline()}</span>
					</label>
					<input
						type="datetime-local"
						id="deadline"
						name="deadline"
						bind:value={$createFormData.deadline}
						class="input input-bordered"
						required
					/>
				</div>
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showCreateModal = false)}>
						{m.cancel()}
					</button>
					<button type="submit" class="btn btn-primary">
						{m.create()}
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" onclick={() => (showCreateModal = false)}></div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && surveyToDelete}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.confirmDeleteSurvey()}</h3>
			<p class="py-4">
				{m.confirmDeleteSurveyDescription({ title: surveyToDelete.title })}
			</p>
			<form method="POST" action="?/deleteSurvey" use:deleteEnhance>
				<input type="hidden" name="id" value={surveyToDelete.id} />
				<div class="modal-action">
					<button
						type="button"
						class="btn"
						onclick={() => {
							showDeleteModal = false;
							surveyToDelete = null;
						}}
					>
						{m.cancel()}
					</button>
					<button type="submit" class="btn btn-error">
						{m.delete()}
					</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop"
			onclick={() => {
				showDeleteModal = false;
				surveyToDelete = null;
			}}
		></div>
	</div>
{/if}
