<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import formatNames, { sortByNames } from '$lib/services/formatNames';
	import type { PageData } from './$types';
	import { stringify } from 'csv-stringify/browser/esm/sync';
	import { superForm } from 'sveltekit-superforms';
	import { invalidateAll } from '$app/navigation';
	import StackChart from '$lib/components/Charts/StackChart.svelte';
	import ChartBar from '$lib/components/Charts/ChartBar.svelte';

	let { data }: { data: PageData } = $props();

	let survey = $derived(data.survey);
	let notAssignedParticipants = $derived(data.usersNotAnswered);

	// Update survey form
	const updateSurveyForm = superForm(data.updateSurveyForm, {
		onResult: async () => {
			await invalidateAll();
			editingSurvey = false;
		}
	});
	const { form: updateSurveyData, enhance: updateSurveyEnhance } = updateSurveyForm;

	// Create option form
	const createOptionForm = superForm(data.createOptionForm, {
		onResult: async () => {
			await invalidateAll();
			showCreateOptionModal = false;
		}
	});
	const { form: createOptionData, enhance: createOptionEnhance } = createOptionForm;

	// Update option form
	const updateOptionForm = superForm(data.updateOptionForm, {
		onResult: async () => {
			await invalidateAll();
			editingOption = null;
		}
	});
	const { form: updateOptionData, enhance: updateOptionEnhance } = updateOptionForm;

	// Delete option form
	const deleteOptionForm = superForm(data.deleteOptionForm, {
		onResult: async () => {
			await invalidateAll();
			showDeleteOptionModal = false;
			optionToDelete = null;
		}
	});
	const { enhance: deleteOptionEnhance } = deleteOptionForm;

	let editingSurvey = $state(false);
	let showCreateOptionModal = $state(false);
	let editingOption = $state<string | null>(null);
	let showDeleteOptionModal = $state(false);
	let optionToDelete = $state<NonNullable<typeof survey>['options'][0] | null>(null);

	// Chart data
	let chartValues = $derived(survey?.options.map((o) => o.countSurveyAnswers) ?? []);
	let chartLabels = $derived(survey?.options.map((o) => o.title) ?? []);
	let totalAnswers = $derived(survey?.surveyAnswers.length ?? 0);
	let totalEligible = $derived(totalAnswers + notAssignedParticipants.length);
	let participationRate = $derived(
		totalEligible > 0 ? Math.round((totalAnswers / totalEligible) * 100) : 0
	);

	const downloadCSV = async (header: string[], csvData: string[][], filename: string) => {
		const csv = [header, ...csvData];
		const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	const downloadResults = () => {
		const header = [m.name(), m.surveyOption()];
		const csvData =
			survey?.surveyAnswers
				.sort((a, b) => sortByNames(a.user, b.user))
				.map((answer) => [
					formatNames(answer.user.given_name, answer.user.family_name, { givenNameFirst: false }),
					survey?.options.find((option) => option.id === answer.option.id)?.title ?? ''
				]) ?? [];

		downloadCSV(header, csvData, `${survey?.title ?? 'survey'}_results.csv`);
	};

	const startEditSurvey = () => {
		if (survey) {
			$updateSurveyData.id = survey.id;
			$updateSurveyData.title = survey.title;
			$updateSurveyData.description = survey.description;
			$updateSurveyData.deadline = survey.deadline.toISOString().slice(0, 16);
			$updateSurveyData.draft = survey.draft;
			editingSurvey = true;
		}
	};

	const startEditOption = (option: NonNullable<typeof survey>['options'][0]) => {
		$updateOptionData.id = option.id;
		$updateOptionData.title = option.title;
		$updateOptionData.description = option.description;
		$updateOptionData.upperLimit = option.upperLimit;
		editingOption = option.id;
	};

	const confirmDeleteOption = (option: NonNullable<typeof survey>['options'][0]) => {
		optionToDelete = option;
		showDeleteOptionModal = true;
	};

	const openCreateOptionModal = () => {
		if (survey) {
			$createOptionData.questionId = survey.id;
			$createOptionData.title = '';
			$createOptionData.description = '';
			$createOptionData.upperLimit = 0;
			showCreateOptionModal = true;
		}
	};

	const formatDeadline = (date: Date) => {
		return date.toLocaleString();
	};
</script>

<div class="flex w-full flex-col gap-8 p-10">
	<!-- Header -->
	<div class="flex w-full flex-col items-center justify-between gap-2 md:flex-row">
		<div class="flex items-center gap-2">
			<h2 class="text-2xl font-bold">{survey?.title}</h2>
			{#if survey?.draft}
				<span class="badge badge-warning">{m.surveyIsDraft()}</span>
			{:else}
				<span class="badge badge-success">{m.surveyIsLive()}</span>
			{/if}
		</div>
		<div class="flex flex-wrap gap-2">
			{#if survey}
				<form method="POST" action="?/toggleDraft">
					<input type="hidden" name="id" value={survey.id} />
					<input type="hidden" name="draft" value={survey.draft.toString()} />
					<button type="submit" class="btn {survey.draft ? 'btn-success' : 'btn-warning'}">
						<i class="fas {survey.draft ? 'fa-eye' : 'fa-eye-slash'}"></i>
						{survey.draft ? m.publishSurvey() : m.unpublishSurvey()}
					</button>
				</form>
			{/if}
			<button class="btn btn-primary" onclick={downloadResults}>
				<i class="fas fa-download"></i>
				{m.downloadResults()}
			</button>
		</div>
	</div>

	<!-- Survey Details Section -->
	<div class="bg-base-200 rounded-lg p-4">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-lg font-bold">{m.surveyDetails()}</h3>
			{#if !editingSurvey}
				<button class="btn btn-sm" onclick={startEditSurvey}>
					<i class="fas fa-edit"></i>
					{m.edit()}
				</button>
			{/if}
		</div>

		{#if editingSurvey && survey}
			<form
				method="POST"
				action="?/updateSurvey"
				use:updateSurveyEnhance
				class="flex flex-col gap-4"
			>
				<input type="hidden" name="id" value={survey.id} />
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.title()}</legend>
					<input
						type="text"
						id="edit-title"
						name="title"
						bind:value={$updateSurveyData.title}
						class="input w-full"
						required
					/>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.description()}</legend>
					<textarea
						id="edit-description"
						name="description"
						bind:value={$updateSurveyData.description}
						class="textarea w-full"
						required
					></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.deadline()}</legend>
					<input
						type="datetime-local"
						id="edit-deadline"
						name="deadline"
						bind:value={$updateSurveyData.deadline}
						class="input w-full"
						required
					/>
				</fieldset>
				<div class="flex gap-2">
					<button type="button" class="btn" onclick={() => (editingSurvey = false)}>
						{m.cancel()}
					</button>
					<button type="submit" class="btn btn-primary">
						{m.save()}
					</button>
				</div>
			</form>
		{:else}
			<div class="grid grid-cols-[auto,1fr] items-center gap-2">
				<i class="fa-duotone fa-info place-self-center"></i>
				<p>{survey?.description}</p>
				<i class="fa-duotone fa-alarm-clock place-self-center"></i>
				<p>{survey ? formatDeadline(survey.deadline) : ''}</p>
			</div>
		{/if}
	</div>

	<!-- Results Visualization Section -->
	<div class="bg-base-200 rounded-lg p-4">
		<h3 class="mb-4 text-lg font-bold">{m.results()}</h3>

		<div class="grid gap-4 md:grid-cols-2">
			<!-- Participation Stats -->
			<div class="bg-base-300 rounded-lg p-4">
				<h4 class="mb-2 font-semibold">{m.participation()}</h4>
				<div class="flex items-center gap-4">
					<div
						class="radial-progress text-primary"
						style="--value:{participationRate};"
						role="progressbar"
					>
						{participationRate}%
					</div>
					<div>
						<p class="text-2xl font-bold">{totalAnswers} / {totalEligible}</p>
						<p class="text-sm opacity-70">{m.participantsAnswered()}</p>
					</div>
				</div>
			</div>

			<!-- Distribution Chart -->
			<div class="bg-base-300 rounded-lg p-4">
				<h4 class="mb-2 font-semibold">{m.distribution()}</h4>
				{#if chartValues.length > 0 && chartValues.some((v) => v > 0)}
					<StackChart values={chartValues} labels={chartLabels} percentage={true} />
				{:else}
					<div class="flex h-24 items-center justify-center text-sm opacity-70">
						{m.noDataYet()}
					</div>
				{/if}
			</div>
		</div>

		<!-- Bar Chart -->
		{#if chartValues.length > 0}
			<div class="bg-base-300 mt-4 rounded-lg p-4">
				<h4 class="mb-2 font-semibold">{m.optionComparison()}</h4>
				<ChartBar values={chartValues} labels={chartLabels} showLabels={true} />
			</div>
		{/if}
	</div>

	<!-- Options Management Section -->
	<div class="bg-base-200 rounded-lg p-4">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-lg font-bold">{m.options()}</h3>
			<button class="btn btn-primary btn-sm" onclick={openCreateOptionModal}>
				<i class="fas fa-plus"></i>
				{m.createOption()}
			</button>
		</div>

		{#if survey?.options && survey.options.length > 0}
			<div class="flex flex-col gap-4">
				{#each survey.options as option}
					<div class="bg-base-300 rounded-lg p-4">
						{#if editingOption === option.id}
							<form
								method="POST"
								action="?/updateOption"
								use:updateOptionEnhance
								class="flex flex-col gap-4"
							>
								<input type="hidden" name="id" value={option.id} />
								<fieldset class="fieldset">
									<legend class="fieldset-legend">{m.title()}</legend>
									<input
										type="text"
										id="option-title-{option.id}"
										name="title"
										bind:value={$updateOptionData.title}
										class="input w-full"
										required
									/>
								</fieldset>
								<fieldset class="fieldset">
									<legend class="fieldset-legend">{m.description()}</legend>
									<textarea
										id="option-description-{option.id}"
										name="description"
										bind:value={$updateOptionData.description}
										class="textarea w-full"
									></textarea>
								</fieldset>
								<fieldset class="fieldset">
									<legend class="fieldset-legend">{m.upperLimit()} ({m.zeroForUnlimited()})</legend>
									<input
										type="number"
										id="option-limit-{option.id}"
										name="upperLimit"
										bind:value={$updateOptionData.upperLimit}
										class="input w-full"
										min="0"
									/>
								</fieldset>
								<div class="flex gap-2">
									<button type="button" class="btn btn-sm" onclick={() => (editingOption = null)}>
										{m.cancel()}
									</button>
									<button type="submit" class="btn btn-primary btn-sm">
										{m.save()}
									</button>
								</div>
							</form>
						{:else}
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1">
									<h4 class="font-semibold">{option.title}</h4>
									<p class="text-sm opacity-70">{option.description}</p>
									<div class="mt-2 flex gap-4 text-sm">
										<span>
											<i class="fas fa-users"></i>
											{option.countSurveyAnswers}
											{m.answers()}
										</span>
										<span>
											<i class="fas fa-users-cog"></i>
											{option.upperLimit === 0 ? m.noLimit() : `${m.limit()}: ${option.upperLimit}`}
										</span>
									</div>
								</div>
								<div class="flex gap-2">
									<button class="btn btn-sm" onclick={() => startEditOption(option)}>
										<i class="fas fa-edit"></i>
									</button>
									<button class="btn btn-error btn-sm" onclick={() => confirmDeleteOption(option)}>
										<i class="fas fa-trash"></i>
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="bg-base-300 rounded p-4 text-center text-sm opacity-70">
				{m.noOptionsYet()}
			</div>
		{/if}
	</div>

	<!-- Participants by Option -->
	{#each survey?.options ?? [] as option}
		{@const users = survey?.surveyAnswers
			.filter((answer) => answer.option.id === option.id)
			.sort((a, b) =>
				formatNames(a.user.given_name, a.user.family_name, { givenNameFirst: false }).localeCompare(
					formatNames(b.user.given_name, b.user.family_name, { givenNameFirst: false })
				)
			)}
		<div class="bg-base-200 flex w-full flex-col rounded-lg p-4">
			<div class="flex gap-2">
				<div class="flex w-full flex-1 flex-col">
					<h3>{option.title}</h3>
					<h4 class="text-xs">{option.description}</h4>
				</div>
				<h3>
					<span class="font-bold">{option.countSurveyAnswers}</span>
					{#if option.upperLimit > 0}
						&nbsp;/&nbsp;<span class="text-xs">{option.upperLimit}</span>
					{/if}
				</h3>
			</div>
			<div class="bg-base-300 mt-4 rounded p-2 text-sm shadow-sm">
				<div class="columns-1 sm:columns-2 md:columns-3 xl:columns-4">
					{#each users ?? [] as u}
						<p>
							<a
								href="/management/{data.conferenceId}/participants?selected={u.user.id}"
								class="hover:underline">{formatNames(u.user.given_name, u.user.family_name)}</a
							>
						</p>
					{/each}
				</div>
			</div>
		</div>
	{/each}

	<!-- Not Assigned Participants -->
	<h2 class="text-2xl font-bold">{m.notAssignedParticipants()}</h2>
	<div class="bg-base-200 flex w-full flex-col rounded-lg p-4 text-sm">
		<div class="columns-1 sm:columns-2 md:columns-3 xl:columns-4">
			{#each notAssignedParticipants as user}
				<p>
					<a
						href="/management/{data.conferenceId}/participants?selected={user.id}"
						class="hover:underline">{formatNames(user.given_name, user.family_name)}</a
					>
				</p>
			{/each}
		</div>
	</div>
</div>

<!-- Create Option Modal -->
{#if showCreateOptionModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.createOption()}</h3>
			<form
				method="POST"
				action="?/createOption"
				use:createOptionEnhance
				class="mt-4 flex flex-col gap-4"
			>
				<input type="hidden" name="questionId" value={survey?.id} />
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.title()}</legend>
					<input
						type="text"
						id="new-option-title"
						name="title"
						bind:value={$createOptionData.title}
						class="input w-full"
						required
					/>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.description()}</legend>
					<textarea
						id="new-option-description"
						name="description"
						bind:value={$createOptionData.description}
						class="textarea w-full"
					></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.upperLimit()} ({m.zeroForUnlimited()})</legend>
					<input
						type="number"
						id="new-option-limit"
						name="upperLimit"
						bind:value={$createOptionData.upperLimit}
						class="input w-full"
						min="0"
					/>
				</fieldset>
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showCreateOptionModal = false)}>
						{m.cancel()}
					</button>
					<button type="submit" class="btn btn-primary">
						{m.create()}
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" onclick={() => (showCreateOptionModal = false)}></div>
	</div>
{/if}

<!-- Delete Option Confirmation Modal -->
{#if showDeleteOptionModal && optionToDelete}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.confirmDeleteOption()}</h3>
			<p class="py-4">
				{m.confirmDeleteOptionDescription({ title: optionToDelete.title })}
			</p>
			<form method="POST" action="?/deleteOption" use:deleteOptionEnhance>
				<input type="hidden" name="id" value={optionToDelete.id} />
				<div class="modal-action">
					<button
						type="button"
						class="btn"
						onclick={() => {
							showDeleteOptionModal = false;
							optionToDelete = null;
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
				showDeleteOptionModal = false;
				optionToDelete = null;
			}}
		></div>
	</div>
{/if}
