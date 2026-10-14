<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { dateToDatetimeLocal, formatInTimezone } from '$lib/helpers/conferenceTimezoneDate';
	import { surveyFields } from '../surveyForm';

	interface Props {
		conferenceId: string;
		surveyId: string;
	}

	let { conferenceId, surveyId }: Props = $props();

	const survey = $derived(
		await client.liveQuery.surveyQuestion({
			__args: { id: surveyId },
			id: true,
			title: true,
			description: true,
			deadline: true,
			showSelectionOnDashboard: true
		})
	);

	// A derived of its own: see the survey overview for why `.timezone` is not read in the
	// derived that creates the live query.
	const conference = $derived(
		await client.liveQuery.conference({ __args: { id: conferenceId }, timezone: true })
	);
	const conferenceTimezone = $derived(conference?.timezone ?? 'UTC');

	let editingSurvey = $state(false);
	let isLoading = $state(false);

	// Edit survey form state
	let editTitle = $state('');
	let editDescription = $state('');
	let editDeadline = $state('');

	const formatDeadline = (date: Date) => {
		return formatInTimezone(date, conferenceTimezone);
	};

	const toggleShowSelection = async () => {
		isLoading = true;
		try {
			await client.mutate.updateSurveyQuestion({
				__args: { id: survey.id, showSelectionOnDashboard: !survey.showSelectionOnDashboard },
				id: true
			});
		} catch (error) {
			console.error('Failed to toggle showSelectionOnDashboard:', error);
		} finally {
			isLoading = false;
		}
	};

	const startEditSurvey = () => {
		editTitle = survey.title;
		editDescription = survey.description;
		editDeadline = dateToDatetimeLocal(survey.deadline, conferenceTimezone);
		editingSurvey = true;
	};

	const saveSurvey = async () => {
		const fields = surveyFields(editTitle, editDescription, editDeadline, conferenceTimezone);
		if (!fields) return;
		isLoading = true;
		try {
			await client.mutate.updateSurveyQuestion({
				__args: { id: survey.id, ...fields },
				id: true
			});
			editingSurvey = false;
		} catch (error) {
			console.error('Failed to update survey:', error);
		} finally {
			isLoading = false;
		}
	};
</script>

<!-- Survey Details Card -->
<div class="card bg-base-100 border-base-200 border shadow-sm">
	<div class="card-body">
		<div class="flex items-center justify-between">
			<h3 class="card-title">{m.surveyDetails()}</h3>
			{#if !editingSurvey}
				<button class="btn btn-sm" onclick={startEditSurvey}>
					<i class="fas fa-edit"></i>
					{m.edit()}
				</button>
			{/if}
		</div>

		{#if editingSurvey}
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.title()}</legend>
					<input type="text" bind:value={editTitle} class="input w-full" required />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.description()}</legend>
					<textarea bind:value={editDescription} class="textarea w-full" required></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.deadline()}</legend>
					<input type="datetime-local" bind:value={editDeadline} class="input w-full" required />
				</fieldset>
				<div class="flex gap-2">
					<button type="button" class="btn" onclick={() => (editingSurvey = false)}>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={saveSurvey}
						disabled={isLoading || !editTitle || !editDescription || !editDeadline}
					>
						{#if isLoading}
							<span class="loading loading-spinner loading-sm"></span>
						{/if}
						{m.save()}
					</button>
				</div>
			</div>
		{:else}
			<div class="mt-4 flex flex-col gap-4">
				<div class="flex flex-col gap-1">
					<span class="text-sm font-medium opacity-60">{m.description()}</span>
					<p class="whitespace-pre-line text-base">{survey.description}</p>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-sm font-medium opacity-60">{m.deadline()}</span>
					<p class="text-base">{formatDeadline(survey.deadline)}</p>
				</div>

				<!-- Toggle switches -->
				<div class="flex flex-col gap-3 pt-2">
					<label class="flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							class="toggle toggle-success"
							checked={survey.showSelectionOnDashboard}
							onchange={toggleShowSelection}
						/>
						<div class="flex flex-col">
							<span class="font-medium">{m.showSelectionOnDashboard()}</span>
							<span class="text-base-content/50 text-xs"
								>{m.showSelectionOnDashboardDescription()}</span
							>
						</div>
					</label>
				</div>
			</div>
		{/if}
	</div>
</div>
