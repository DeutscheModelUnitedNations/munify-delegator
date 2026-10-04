<script lang="ts">
	import ActionModal from '$lib/components/ActionModal.svelte';
	import ConfirmDeleteModal from '$lib/components/ConfirmDeleteModal.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import { surveyFields } from './surveyForm';
	import SurveyCard from './SurveyCard.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Only what decides which section a survey goes into (each card fetches its own details), and
	// the timezone deadlines are entered in. One derived, so neither waits on the other.
	//
	// `.timezone` is read in a second derived, not here: reading it inside the derived that creates
	// the live query subscribes that derived to its own query, so the query's first update re-runs
	// it, which creates a new query, which updates again - the page never stops re-rendering.
	const [surveys, conference] = $derived(
		await Promise.all([
			client.liveQuery.surveyQuestions({
				__args: {
					where: { conferenceId: { eq: params.conferenceId } },
					orderBy: { createdAt: 'desc' }
				},
				id: true,
				hidden: true
			}),
			client.liveQuery.conference({ __args: { id: params.conferenceId }, timezone: true })
		])
	);
	const conferenceTimezone = $derived(conference?.timezone ?? 'UTC');
	let visibleSurveys = $derived(surveys.filter((s) => !s.hidden));
	let hiddenSurveys = $derived(surveys.filter((s) => s.hidden));

	// Modal state
	let showCreateModal = $state(false);
	let showDeleteModal = $state(false);
	let surveyToDelete = $state<{ id: string; title: string } | null>(null);
	let isLoading = $state(false);
	let hiddenSurveysExpanded = $state(false);

	// Create form state
	let createTitle = $state('');
	let createDescription = $state('');
	let createDeadline = $state('');

	// Actions
	const createSurvey = async () => {
		const fields = surveyFields(createTitle, createDescription, createDeadline, conferenceTimezone);
		if (!fields) return;
		isLoading = true;
		try {
			await client.mutate.createSurveyQuestion({
				__args: { conferenceId: params.conferenceId, ...fields, draft: true },
				id: true
			});
			showCreateModal = false;
			createTitle = '';
			createDescription = '';
			createDeadline = '';
		} catch (error) {
			console.error('Failed to create survey:', error);
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			isLoading = false;
		}
	};

	const deleteSurvey = async () => {
		if (!surveyToDelete) return;
		isLoading = true;
		try {
			await client.mutate.deleteSurveyQuestion({ __args: { id: surveyToDelete.id } });
			showDeleteModal = false;
			surveyToDelete = null;
		} catch (error) {
			console.error('Failed to delete survey:', error);
		} finally {
			isLoading = false;
		}
	};

	const confirmDelete = (survey: { id: string; title: string }) => {
		surveyToDelete = survey;
		showDeleteModal = true;
	};
</script>

<div class="flex flex-col gap-6 p-4">
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
		{#each visibleSurveys as survey (survey.id)}
			<SurveyCard
				surveyId={survey.id}
				conferenceId={params.conferenceId}
				{conferenceTimezone}
				onDelete={confirmDelete}
			/>
		{/each}

		{#if hiddenSurveys.length > 0}
			<div class="collapse collapse-arrow bg-base-200">
				<input type="checkbox" bind:checked={hiddenSurveysExpanded} />
				<div class="collapse-title font-medium">
					<i class="fa-duotone fa-box-archive mr-2"></i>
					{m.archivedSurveys()} ({hiddenSurveys.length})
				</div>
				<div class="collapse-content flex flex-col gap-4">
					{#each hiddenSurveys as survey (survey.id)}
						<SurveyCard
							surveyId={survey.id}
							conferenceId={params.conferenceId}
							{conferenceTimezone}
							onDelete={confirmDelete}
						/>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Create Survey Modal -->
{#if showCreateModal}
	<ActionModal
		title={m.createSurvey()}
		confirmLabel={m.create()}
		confirmDisabled={!createTitle || !createDescription || !createDeadline}
		loading={isLoading}
		onConfirm={createSurvey}
		onClose={() => (showCreateModal = false)}
	>
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
	</ActionModal>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && surveyToDelete}
	<ConfirmDeleteModal
		title={m.confirmDeleteSurvey()}
		text={m.confirmDeleteSurveyDescription({ title: surveyToDelete.title })}
		onConfirm={deleteSurvey}
		onClose={() => {
			showDeleteModal = false;
			surveyToDelete = null;
		}}
	/>
{/if}
