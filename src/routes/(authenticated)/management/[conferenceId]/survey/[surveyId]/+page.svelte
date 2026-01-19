<script lang="ts">
	import { graphql, cache } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import PieChart from '$lib/components/Charts/ECharts/PieChart.svelte';
	import BarChart from '$lib/components/Charts/ECharts/BarChart.svelte';
	import GaugeChart from '$lib/components/Charts/ECharts/GaugeChart.svelte';
	import LineChart from '$lib/components/Charts/ECharts/LineChart.svelte';
	import CollapsibleParticipantList from '$lib/components/CollapsibleParticipantList.svelte';
	import DownloadCategoryCard from '../../downloads/DownloadCategoryCard.svelte';
	import SurveyExportButtons from './SurveyExportButtons.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let { data }: { data: PageData } = $props();

	let survey = $derived(data.survey);
	let notAnsweredParticipants = $derived(data.usersNotAnswered);

	// Mutations
	const UpdateSurveyMutation = graphql(`
		mutation UpdateSurveyQuestionFromDetail(
			$id: String!
			$title: StringFieldUpdateOperationsInput
			$description: StringFieldUpdateOperationsInput
			$deadline: DateTimeFieldUpdateOperationsInput
			$draft: BoolFieldUpdateOperationsInput
		) {
			updateOneSurveyQuestion(
				where: { id: $id }
				data: { title: $title, description: $description, deadline: $deadline, draft: $draft }
			) {
				id
			}
		}
	`);

	const CreateOptionMutation = graphql(`
		mutation CreateSurveyOptionFromDetail(
			$questionId: String!
			$title: String!
			$description: String!
			$upperLimit: Int!
		) {
			createOneSurveyOption(
				data: {
					questionId: $questionId
					title: $title
					description: $description
					upperLimit: $upperLimit
				}
			) {
				id
			}
		}
	`);

	const UpdateOptionMutation = graphql(`
		mutation UpdateSurveyOptionFromDetail(
			$id: String!
			$title: StringFieldUpdateOperationsInput
			$description: StringFieldUpdateOperationsInput
			$upperLimit: IntFieldUpdateOperationsInput
		) {
			updateOneSurveyOption(
				where: { id: $id }
				data: { title: $title, description: $description, upperLimit: $upperLimit }
			) {
				id
			}
		}
	`);

	const DeleteOptionMutation = graphql(`
		mutation DeleteSurveyOptionFromDetail($id: String!) {
			deleteOneSurveyOption(where: { id: $id }) {
				id
			}
		}
	`);

	// Tab state
	type SurveyTab = 'settings' | 'results';
	let activeTab = $state<SurveyTab>('results');

	// UI state
	let editingSurvey = $state(false);
	let showCreateOptionModal = $state(false);
	let editingOption = $state<string | null>(null);
	let showDeleteOptionModal = $state(false);
	let optionToDelete = $state<NonNullable<typeof survey>['options'][0] | null>(null);
	let isLoading = $state(false);

	// Edit survey form state
	let editTitle = $state('');
	let editDescription = $state('');
	let editDeadline = $state('');

	// Create option form state
	let createOptionTitle = $state('');
	let createOptionDescription = $state('');
	let createOptionUpperLimit = $state(0);

	// Update option form state
	let updateOptionTitle = $state('');
	let updateOptionDescription = $state('');
	let updateOptionUpperLimit = $state(0);

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

	// Timeline chart data - cumulative answers over time per option
	let timelineData = $derived.by(() => {
		if (!survey?.surveyAnswers.length || !survey?.options.length) {
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

	// Helpers
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

	const formatDeadline = (date: Date) => {
		return date.toLocaleString();
	};

	const formatDatetimeLocal = (date: Date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	};

	// Actions
	const toggleDraft = async () => {
		if (!survey) return;
		isLoading = true;
		try {
			await UpdateSurveyMutation.mutate({
				id: survey.id,
				draft: { set: !survey.draft }
			});
			cache.markStale();
			await invalidateAll();
		} catch (error) {
			console.error('Failed to toggle draft status:', error);
		} finally {
			isLoading = false;
		}
	};

	const startEditSurvey = () => {
		if (survey) {
			editTitle = survey.title;
			editDescription = survey.description;
			editDeadline = formatDatetimeLocal(survey.deadline);
			editingSurvey = true;
		}
	};

	const saveSurvey = async () => {
		if (!survey || !editTitle || !editDescription || !editDeadline) return;
		isLoading = true;
		try {
			await UpdateSurveyMutation.mutate({
				id: survey.id,
				title: { set: editTitle },
				description: { set: editDescription },
				deadline: { set: new Date(editDeadline) }
			});
			cache.markStale();
			await invalidateAll();
			editingSurvey = false;
		} catch (error) {
			console.error('Failed to update survey:', error);
		} finally {
			isLoading = false;
		}
	};

	const openCreateOptionModal = () => {
		createOptionTitle = '';
		createOptionDescription = '';
		createOptionUpperLimit = 0;
		showCreateOptionModal = true;
	};

	const createOption = async () => {
		if (!survey || !createOptionTitle) return;
		isLoading = true;
		try {
			await CreateOptionMutation.mutate({
				questionId: survey.id,
				title: createOptionTitle,
				description: createOptionDescription,
				upperLimit: createOptionUpperLimit
			});
			cache.markStale();
			await invalidateAll();
			showCreateOptionModal = false;
		} catch (error) {
			console.error('Failed to create option:', error);
		} finally {
			isLoading = false;
		}
	};

	const startEditOption = (option: NonNullable<typeof survey>['options'][0]) => {
		updateOptionTitle = option.title;
		updateOptionDescription = option.description;
		updateOptionUpperLimit = option.upperLimit;
		editingOption = option.id;
	};

	const saveOption = async () => {
		if (!editingOption || !updateOptionTitle) return;
		isLoading = true;
		try {
			await UpdateOptionMutation.mutate({
				id: editingOption,
				title: { set: updateOptionTitle },
				description: { set: updateOptionDescription },
				upperLimit: { set: updateOptionUpperLimit }
			});
			cache.markStale();
			await invalidateAll();
			editingOption = null;
		} catch (error) {
			console.error('Failed to update option:', error);
		} finally {
			isLoading = false;
		}
	};

	const confirmDeleteOption = (option: NonNullable<typeof survey>['options'][0]) => {
		optionToDelete = option;
		showDeleteOptionModal = true;
	};

	const deleteOption = async () => {
		if (!optionToDelete) return;
		isLoading = true;
		try {
			await DeleteOptionMutation.mutate({
				id: optionToDelete.id
			});
			cache.markStale();
			await invalidateAll();
			showDeleteOptionModal = false;
			optionToDelete = null;
		} catch (error) {
			console.error('Failed to delete option:', error);
		} finally {
			isLoading = false;
		}
	};
</script>

<div class="flex w-full flex-col gap-6 p-4">
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
			<button class="btn {survey.draft ? 'btn-success' : 'btn-warning'}" onclick={toggleDraft}>
				<i class="fas {survey.draft ? 'fa-eye' : 'fa-eye-slash'}"></i>
				{survey.draft ? m.publishSurvey() : m.unpublishSurvey()}
			</button>
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
					surveyId={data.surveyId}
					conferenceId={data.conferenceId}
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
							<input
								type="datetime-local"
								bind:value={editDeadline}
								class="input w-full"
								required
							/>
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
							<p class="text-base">{survey?.description}</p>
						</div>
						<div class="flex flex-col gap-1">
							<span class="text-sm font-medium opacity-60">{m.deadline()}</span>
							<p class="text-base">{survey ? formatDeadline(survey.deadline) : ''}</p>
						</div>
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
									<div class="flex flex-col gap-4">
										<fieldset class="fieldset">
											<legend class="fieldset-legend">{m.title()}</legend>
											<input
												type="text"
												bind:value={updateOptionTitle}
												class="input w-full"
												required
											/>
										</fieldset>
										<fieldset class="fieldset">
											<legend class="fieldset-legend">{m.description()}</legend>
											<textarea bind:value={updateOptionDescription} class="textarea w-full"
											></textarea>
										</fieldset>
										<fieldset class="fieldset">
											<legend class="fieldset-legend"
												>{m.upperLimit()} ({m.zeroForUnlimited()})</legend
											>
											<input
												type="number"
												bind:value={updateOptionUpperLimit}
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
											<button
												type="button"
												class="btn btn-primary btn-sm"
												onclick={saveOption}
												disabled={isLoading || !updateOptionTitle}
											>
												{#if isLoading}
													<span class="loading loading-spinner loading-sm"></span>
												{/if}
												{m.save()}
											</button>
										</div>
									</div>
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
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.title()}</legend>
					<input type="text" bind:value={createOptionTitle} class="input w-full" required />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.description()}</legend>
					<textarea bind:value={createOptionDescription} class="textarea w-full"></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.upperLimit()} ({m.zeroForUnlimited()})</legend>
					<input type="number" bind:value={createOptionUpperLimit} class="input w-full" min="0" />
				</fieldset>
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showCreateOptionModal = false)}>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={createOption}
						disabled={isLoading || !createOptionTitle}
					>
						{#if isLoading}
							<span class="loading loading-spinner loading-sm"></span>
						{/if}
						{m.create()}
					</button>
				</div>
			</div>
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
				<button type="button" class="btn btn-error" onclick={deleteOption} disabled={isLoading}>
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
				showDeleteOptionModal = false;
				optionToDelete = null;
			}}
		></div>
	</div>
{/if}
