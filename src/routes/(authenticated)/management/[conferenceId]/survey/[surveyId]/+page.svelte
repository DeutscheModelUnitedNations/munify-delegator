<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms';
	import { invalidateAll } from '$app/navigation';
	import PieChart from '$lib/components/Charts/ECharts/PieChart.svelte';
	import BarChart from '$lib/components/Charts/ECharts/BarChart.svelte';
	import GaugeChart from '$lib/components/Charts/ECharts/GaugeChart.svelte';
	import CollapsibleParticipantList from '$lib/components/CollapsibleParticipantList.svelte';
	import DownloadCategoryCard from '../../downloads/DownloadCategoryCard.svelte';
	import SurveyExportButtons from './SurveyExportButtons.svelte';

	let { data }: { data: PageData } = $props();

	let survey = $derived(data.survey);
	let notAnsweredParticipants = $derived(data.usersNotAnswered);

	// Tab state
	type SurveyTab = 'settings' | 'results';
	let activeTab = $state<SurveyTab>('results');

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
	let pieChartData = $derived(
		survey?.options.map((o) => ({ name: o.title, value: o.countSurveyAnswers })) ?? []
	);
	let chartLabels = $derived(survey?.options.map((o) => o.title) ?? []);
	let chartValues = $derived(survey?.options.map((o) => o.countSurveyAnswers) ?? []);
	let totalAnswers = $derived(survey?.surveyAnswers.length ?? 0);
	let totalEligible = $derived(totalAnswers + notAnsweredParticipants.length);
	let participationRate = $derived(
		totalEligible > 0 ? Math.round((totalAnswers / totalEligible) * 100) : 0
	);

	// Participant lists per option
	const getParticipantsForOption = (optionId: string) => {
		return (
			survey?.surveyAnswers
				.filter((answer) => answer.option.id === optionId)
				.map((answer) => answer.user)
				.sort((a, b) =>
					formatNames(a.given_name, a.family_name).localeCompare(
						formatNames(b.given_name, b.family_name)
					)
				) ?? []
		);
	};

	const startEditSurvey = () => {
		if (survey) {
			$updateSurveyData.id = survey.id;
			$updateSurveyData.title = survey.title;
			$updateSurveyData.description = survey.description;
			$updateSurveyData.deadline = formatDatetimeLocal(survey.deadline);
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

	// Format Date for datetime-local input (uses local time, not UTC)
	const formatDatetimeLocal = (date: Date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	};
</script>

<div class="flex w-full flex-col gap-6 p-10">
	<!-- Header -->
	<div class="flex w-full flex-col items-center justify-between gap-2 md:flex-row">
		<div class="flex flex-col gap-2">
			<h2 class="text-2xl font-bold">{survey?.title}</h2>
			{#if survey?.draft}
				<span class="badge badge-warning">{m.surveyIsDraft()}</span>
			{:else}
				<span class="badge badge-success">{m.surveyIsLive()}</span>
			{/if}
		</div>
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
	</div>

	<!-- Tabs -->
	<div class="tabs tabs-boxed w-fit">
		<button
			class="tab"
			class:tab-active={activeTab === 'results'}
			onclick={() => (activeTab = 'results')}
		>
			<i class="fas fa-chart-pie mr-2"></i>
			{m.surveyResults()}
		</button>
		<button
			class="tab"
			class:tab-active={activeTab === 'settings'}
			onclick={() => (activeTab = 'settings')}
		>
			<i class="fas fa-cog mr-2"></i>
			{m.surveySettings()}
		</button>
	</div>

	<!-- Results Tab -->
	{#if activeTab === 'results'}
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

		<!-- Participant Lists -->
		<div class="flex flex-col gap-3">
			<h3 class="text-lg font-bold">{m.answers()}</h3>
			{#each survey?.options ?? [] as option (option.id)}
				{@const participants = getParticipantsForOption(option.id)}
				<CollapsibleParticipantList
					title={option.title}
					description={option.description}
					count={option.countSurveyAnswers}
					limit={option.upperLimit}
					{participants}
					conferenceId={data.conferenceId}
				/>
			{/each}

			<CollapsibleParticipantList
				title={m.notAssignedParticipants()}
				count={notAnsweredParticipants.length}
				participants={notAnsweredParticipants}
				conferenceId={data.conferenceId}
			/>
		</div>

		<!-- Export Section -->
		{#if survey}
			<DownloadCategoryCard
				title={m.surveyExports()}
				description={m.surveyExportsDescription()}
				icon="fas fa-file-export"
			>
				<SurveyExportButtons
					surveyTitle={survey.title}
					options={survey.options}
					surveyAnswers={survey.surveyAnswers}
					{notAnsweredParticipants}
				/>
			</DownloadCategoryCard>
		{/if}
	{/if}

	<!-- Settings Tab -->
	{#if activeTab === 'settings'}
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

				{#if editingSurvey && survey}
					<form
						method="POST"
						action="?/updateSurvey"
						use:updateSurveyEnhance
						class="mt-4 flex flex-col gap-4"
					>
						<input type="hidden" name="id" value={survey.id} />
						<fieldset class="fieldset">
							<legend class="fieldset-legend">{m.title()}</legend>
							<input
								type="text"
								name="title"
								bind:value={$updateSurveyData.title}
								class="input w-full"
								required
							/>
						</fieldset>
						<fieldset class="fieldset">
							<legend class="fieldset-legend">{m.description()}</legend>
							<textarea
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
					<div class="mt-2 grid grid-cols-[auto,1fr] items-center gap-x-4 gap-y-2">
						<i class="fa-duotone fa-text text-base-content/50"></i>
						<p>{survey?.description}</p>
						<i class="fa-duotone fa-alarm-clock text-base-content/50"></i>
						<p>{survey ? formatDeadline(survey.deadline) : ''}</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Options Management Card -->
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body">
				<div class="flex items-center justify-between">
					<h3 class="card-title">{m.options()}</h3>
					<button class="btn btn-primary btn-sm" onclick={openCreateOptionModal}>
						<i class="fas fa-plus"></i>
						{m.createOption()}
					</button>
				</div>

				{#if survey?.options && survey.options.length > 0}
					<div class="mt-4 flex flex-col gap-3">
						{#each survey.options as option (option.id)}
							<div class="bg-base-200 rounded-lg p-4">
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
												name="title"
												bind:value={$updateOptionData.title}
												class="input w-full"
												required
											/>
										</fieldset>
										<fieldset class="fieldset">
											<legend class="fieldset-legend">{m.description()}</legend>
											<textarea
												name="description"
												bind:value={$updateOptionData.description}
												class="textarea w-full"
											></textarea>
										</fieldset>
										<fieldset class="fieldset">
											<legend class="fieldset-legend"
												>{m.upperLimit()} ({m.zeroForUnlimited()})</legend
											>
											<input
												type="number"
												name="upperLimit"
												bind:value={$updateOptionData.upperLimit}
												class="input w-full"
												min="0"
											/>
										</fieldset>
										<div class="flex gap-2">
											<button
												type="button"
												class="btn btn-sm"
												onclick={() => (editingOption = null)}
											>
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
											{#if option.description}
												<p class="text-sm opacity-70">{option.description}</p>
											{/if}
											<div class="mt-2 flex gap-4 text-sm opacity-70">
												<span>
													<i class="fas fa-users"></i>
													{option.countSurveyAnswers}
													{m.answers()}
												</span>
												<span>
													<i class="fas fa-ban"></i>
													{option.upperLimit === 0
														? m.noLimit()
														: `${m.limit()}: ${option.upperLimit}`}
												</span>
											</div>
										</div>
										<div class="flex gap-2">
											<button class="btn btn-ghost btn-sm" onclick={() => startEditOption(option)}>
												<i class="fas fa-edit"></i>
											</button>
											<button
												class="btn btn-ghost btn-sm text-error"
												onclick={() => confirmDeleteOption(option)}
											>
												<i class="fas fa-trash"></i>
											</button>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<div class="bg-base-200 mt-4 rounded-lg p-8 text-center text-sm opacity-50">
						{m.noOptionsYet()}
					</div>
				{/if}
			</div>
		</div>
	{/if}
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
						name="title"
						bind:value={$createOptionData.title}
						class="input w-full"
						required
					/>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.description()}</legend>
					<textarea
						name="description"
						bind:value={$createOptionData.description}
						class="textarea w-full"
					></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.upperLimit()} ({m.zeroForUnlimited()})</legend>
					<input
						type="number"
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
