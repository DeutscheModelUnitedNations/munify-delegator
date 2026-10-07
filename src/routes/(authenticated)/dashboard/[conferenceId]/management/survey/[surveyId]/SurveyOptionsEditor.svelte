<script lang="ts">
	import ActionModal from '$lib/components/ActionModal.svelte';
	import ConfirmDeleteModal from '$lib/components/ConfirmDeleteModal.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import SurveyOptionFields from './SurveyOptionFields.svelte';

	interface Props {
		surveyId: string;
	}

	let { surveyId }: Props = $props();

	const survey = $derived(
		await client.liveQuery.surveyQuestion({
			__args: { id: surveyId },
			id: true,
			options: {
				id: true,
				title: true,
				description: true,
				countSurveyAnswers: true,
				upperLimit: true
			}
		})
	);

	type SurveyOption = (typeof survey)['options'][number];

	let showCreateOptionModal = $state(false);
	let editingOption = $state<string | null>(null);
	let showDeleteOptionModal = $state(false);
	let optionToDelete = $state<SurveyOption | null>(null);
	let isLoading = $state(false);

	// Create option form state
	let createOptionTitle = $state('');
	let createOptionDescription = $state('');
	let createOptionUpperLimit = $state(0);

	// Update option form state
	let updateOptionTitle = $state('');
	let updateOptionDescription = $state('');
	let updateOptionUpperLimit = $state(0);

	const openCreateOptionModal = () => {
		createOptionTitle = '';
		createOptionDescription = '';
		createOptionUpperLimit = 0;
		showCreateOptionModal = true;
	};

	const createOption = async () => {
		if (!createOptionTitle) return;
		isLoading = true;
		try {
			await client.mutate.createSurveyOption({
				__args: {
					questionId: surveyId,
					title: createOptionTitle,
					description: createOptionDescription,
					upperLimit: createOptionUpperLimit
				},
				id: true
			});
			showCreateOptionModal = false;
		} catch (error) {
			console.error('Failed to create option:', error);
		} finally {
			isLoading = false;
		}
	};

	const startEditOption = (option: SurveyOption) => {
		updateOptionTitle = option.title;
		updateOptionDescription = option.description;
		updateOptionUpperLimit = option.upperLimit;
		editingOption = option.id;
	};

	const saveOption = async () => {
		if (!editingOption || !updateOptionTitle) return;
		isLoading = true;
		try {
			await client.mutate.updateSurveyOption({
				__args: {
					id: editingOption,
					title: updateOptionTitle,
					description: updateOptionDescription,
					upperLimit: updateOptionUpperLimit
				},
				id: true
			});
			editingOption = null;
		} catch (error) {
			console.error('Failed to update option:', error);
		} finally {
			isLoading = false;
		}
	};

	const confirmDeleteOption = (option: SurveyOption) => {
		optionToDelete = option;
		showDeleteOptionModal = true;
	};

	const deleteOption = async () => {
		if (!optionToDelete) return;
		isLoading = true;
		try {
			await client.mutate.deleteSurveyOption({ __args: { id: optionToDelete.id } });
			showDeleteOptionModal = false;
			optionToDelete = null;
		} catch (error) {
			console.error('Failed to delete option:', error);
		} finally {
			isLoading = false;
		}
	};
</script>

{#snippet optionEditor()}
	<div class="flex flex-col gap-4">
		<SurveyOptionFields
			bind:title={updateOptionTitle}
			bind:description={updateOptionDescription}
			bind:upperLimit={updateOptionUpperLimit}
		/>
		<div class="flex gap-2">
			<button type="button" class="btn btn-sm" onclick={() => (editingOption = null)}>
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
{/snippet}

{#snippet optionSummary(option: SurveyOption)}
	<div class="flex items-start justify-between gap-4">
		<div class="flex-1">
			<h4 class="font-semibold">{option.title}</h4>
			{#if option.description}
				<p class="whitespace-pre-line text-sm opacity-70">{option.description}</p>
			{/if}
			<div class="mt-2 flex gap-4 text-sm opacity-70">
				<span>
					<i class="fas fa-users"></i>
					{option.countSurveyAnswers}
					{m.answers()}
				</span>
				<span>
					<i class="fas fa-ban"></i>
					{option.upperLimit === 0 ? m.noLimit() : `${m.limit()}: ${option.upperLimit}`}
				</span>
			</div>
		</div>
		<div class="flex gap-2">
			<button
				class="btn btn-ghost btn-sm"
				aria-label={m.edit()}
				onclick={() => startEditOption(option)}
			>
				<i class="fas fa-edit"></i>
			</button>
			<button
				class="btn btn-ghost btn-sm text-error"
				aria-label={m.delete()}
				onclick={() => confirmDeleteOption(option)}
			>
				<i class="fas fa-trash"></i>
			</button>
		</div>
	</div>
{/snippet}

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

		{#if survey.options.length > 0}
			<div class="mt-4 flex flex-col gap-3">
				{#each survey.options as option (option.id)}
					<div class="bg-base-200 rounded-lg p-4">
						{#if editingOption === option.id}
							{@render optionEditor()}
						{:else}
							{@render optionSummary(option)}
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

<!-- Create Option Modal -->
{#if showCreateOptionModal}
	<ActionModal
		title={m.createOption()}
		confirmLabel={m.create()}
		confirmDisabled={!createOptionTitle}
		loading={isLoading}
		onConfirm={createOption}
		onClose={() => (showCreateOptionModal = false)}
	>
		<SurveyOptionFields
			bind:title={createOptionTitle}
			bind:description={createOptionDescription}
			bind:upperLimit={createOptionUpperLimit}
		/>
	</ActionModal>
{/if}

<!-- Delete Option Confirmation Modal -->
{#if showDeleteOptionModal && optionToDelete}
	<ConfirmDeleteModal
		title={m.confirmDeleteOption()}
		text={m.confirmDeleteOptionDescription({ title: optionToDelete.title })}
		onConfirm={deleteOption}
		onClose={() => {
			showDeleteOptionModal = false;
			optionToDelete = null;
		}}
	/>
{/if}
