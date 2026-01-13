<script lang="ts">
	import { graphql, cache } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import PieChart from '$lib/components/Charts/ECharts/PieChart.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let surveys = $derived(data.surveys);

	// Mutations
	const CreateSurveyMutation = graphql(`
		mutation CreateSurveyQuestionFromList(
			$conferenceId: String!
			$title: String!
			$description: String!
			$deadline: DateTime!
		) {
			createOneSurveyQuestion(
				data: {
					conferenceId: $conferenceId
					title: $title
					description: $description
					deadline: $deadline
					draft: true
				}
			) {
				id
			}
		}
	`);

	const UpdateSurveyMutation = graphql(`
		mutation UpdateSurveyQuestionFromList($id: String!, $draft: BoolFieldUpdateOperationsInput) {
			updateOneSurveyQuestion(where: { id: $id }, data: { draft: $draft }) {
				id
			}
		}
	`);

	const DeleteSurveyMutation = graphql(`
		mutation DeleteSurveyQuestionFromList($id: String!) {
			deleteOneSurveyQuestion(where: { id: $id }) {
				id
			}
		}
	`);

	// Modal state
	let showCreateModal = $state(false);
	let showDeleteModal = $state(false);
	let surveyToDelete = $state<(typeof surveys)[0] | null>(null);
	let isLoading = $state(false);

	// Create form state
	let createTitle = $state('');
	let createDescription = $state('');
	let createDeadline = $state('');

	// Helpers
	const getTotalAnswers = (survey: (typeof surveys)[0]) => {
		return survey.options.reduce((sum, opt) => sum + opt.countSurveyAnswers, 0);
	};

	const getChartData = (survey: (typeof surveys)[0]) => {
		return survey.options.map((opt) => ({
			name: opt.title,
			value: opt.countSurveyAnswers
		}));
	};

	const formatDeadline = (date: Date) => {
		return date.toLocaleString();
	};

	// Actions
	const createSurvey = async () => {
		if (!createTitle || !createDescription || !createDeadline) return;
		isLoading = true;
		try {
			await CreateSurveyMutation.mutate({
				conferenceId: data.conferenceId,
				title: createTitle,
				description: createDescription,
				deadline: new Date(createDeadline)
			});
			cache.markStale();
			await invalidateAll();
			showCreateModal = false;
			createTitle = '';
			createDescription = '';
			createDeadline = '';
		} finally {
			isLoading = false;
		}
	};

	const toggleDraft = async (id: string, currentDraft: boolean) => {
		await UpdateSurveyMutation.mutate({
			id,
			draft: { set: !currentDraft }
		});
		cache.markStale();
		await invalidateAll();
	};

	const deleteSurvey = async () => {
		if (!surveyToDelete) return;
		isLoading = true;
		try {
			await DeleteSurveyMutation.mutate({
				id: surveyToDelete.id
			});
			cache.markStale();
			await invalidateAll();
			showDeleteModal = false;
			surveyToDelete = null;
		} finally {
			isLoading = false;
		}
	};

	const confirmDelete = (survey: (typeof surveys)[0]) => {
		surveyToDelete = survey;
		showDeleteModal = true;
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
		{#each surveys as survey (survey.id)}
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
						<button
							class="btn btn-sm {survey.draft ? 'btn-success' : 'btn-warning'}"
							onclick={() => toggleDraft(survey.id, survey.draft)}
						>
							<i class="fas {survey.draft ? 'fa-eye' : 'fa-eye-slash'}"></i>
							{survey.draft ? m.publishSurvey() : m.unpublishSurvey()}
						</button>
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

				{#if survey.options.length > 0}
					<div class="flex items-start gap-4">
						<div class="w-28 shrink-0">
							<PieChart
								data={getChartData(survey)}
								donut={true}
								showLegend={false}
								showLabels={false}
								height="112px"
							/>
						</div>
						<div class="flex flex-1 flex-col gap-1 overflow-hidden">
							<!-- Summary stats table -->
							<div class="bg-base-300 overflow-hidden rounded-t-lg">
								<table class="table table-sm">
									<tbody>
										<tr class="border-base-200">
											<td class="font-medium">{m.deadline()}</td>
											<td class="text-right font-medium">{formatDeadline(survey.deadline)}</td>
										</tr>
										<tr class="border-base-200 border-b-0">
											<td class="font-medium">{m.totalAnswers()}</td>
											<td class="text-right font-medium">{getTotalAnswers(survey)}</td>
										</tr>
									</tbody>
								</table>
							</div>
							<!-- Per-option stats table -->
							{#if survey.options.length > 0}
								<div class="bg-base-300 overflow-hidden rounded-b-lg">
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
							{/if}
						</div>
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
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.title()}</legend>
					<input type="text" bind:value={createTitle} class="input w-full" required />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.description()}</legend>
					<textarea bind:value={createDescription} class="textarea w-full" required></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.deadline()}</legend>
					<input type="datetime-local" bind:value={createDeadline} class="input w-full" required />
				</fieldset>
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showCreateModal = false)}>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={createSurvey}
						disabled={isLoading || !createTitle || !createDescription || !createDeadline}
					>
						{#if isLoading}
							<span class="loading loading-spinner loading-sm"></span>
						{/if}
						{m.create()}
					</button>
				</div>
			</div>
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
				<button type="button" class="btn btn-error" onclick={deleteSurvey} disabled={isLoading}>
					{#if isLoading}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
					{m.delete()}
				</button>
			</div>
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
