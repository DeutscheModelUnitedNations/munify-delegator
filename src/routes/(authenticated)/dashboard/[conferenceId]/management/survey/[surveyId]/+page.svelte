<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import SurveyResults from './SurveyResults.svelte';
	import SurveyDetailsCard from './SurveyDetailsCard.svelte';
	import SurveyOptionsEditor from './SurveyOptionsEditor.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Only the header; each tab fetches what it shows.
	const survey = $derived(
		await client.liveQuery.surveyQuestion({
			__args: { id: params.surveyId },
			id: true,
			title: true,
			draft: true,
			hidden: true
		})
	);

	// Tab state
	type SurveyTab = 'settings' | 'results';
	let activeTab = $state<SurveyTab>('results');

	const toggleDraft = async () => {
		if (!survey) return;
		try {
			await client.mutate.updateSurveyQuestion({
				__args: { id: survey.id, draft: !survey.draft },
				id: true
			});
		} catch (error) {
			console.error('Failed to toggle draft status:', error);
		}
	};

	const toggleHidden = async () => {
		if (!survey) return;
		try {
			await client.mutate.updateSurveyQuestion({
				__args: { id: survey.id, hidden: !survey.hidden },
				id: true
			});
		} catch (error) {
			console.error('Failed to toggle hidden status:', error);
		}
	};
</script>

<div class="flex w-full flex-col gap-6 p-4">
	<header
		class="flex flex-col gap-3 border-b border-base-300 pb-4 md:flex-row md:items-center md:justify-between"
	>
		<div class="flex min-w-0 items-center gap-3">
			<a
				class="btn btn-square btn-ghost btn-sm"
				href={resolve(`/dashboard/${params.conferenceId}/management/survey`)}
				title={m.survey()}
				aria-label={m.survey()}
			>
				<i class="fa-sharp-duotone fa-solid fa-arrow-left"></i>
			</a>
			<h2 class="truncate text-2xl font-bold">{survey?.title}</h2>
			{#if survey?.hidden}
				<span class="badge badge-soft">
					<i class="fa-sharp-duotone fa-solid fa-box-archive"></i>
					{m.archivedSurvey()}
				</span>
			{/if}
		</div>
		{#if survey}
			<div class="flex flex-none flex-wrap gap-2">
				<button class="btn btn-ghost btn-sm" onclick={toggleDraft}>
					<i
						class="fa-sharp-duotone fa-solid {survey.draft
							? 'fa-eye-slash text-warning'
							: 'fa-eye text-success'}"
					></i>
					{survey.draft ? m.surveyIsDraft() : m.surveyIsLive()}
				</button>
				<button class="btn btn-ghost btn-sm" onclick={toggleHidden}>
					<i class="fa-sharp-duotone fa-solid fa-box-archive"></i>
					{survey.hidden ? m.unarchiveSurvey() : m.archiveSurvey()}
				</button>
			</div>
		{/if}
	</header>

	<div role="tablist" class="tabs-border tabs">
		<button
			role="tab"
			class="tab gap-2"
			class:tab-active={activeTab === 'results'}
			onclick={() => (activeTab = 'results')}
		>
			<i class="fa-sharp-duotone fa-solid fa-chart-pie"></i>
			{m.surveyResults()}
		</button>
		<button
			role="tab"
			class="tab gap-2"
			class:tab-active={activeTab === 'settings'}
			onclick={() => (activeTab = 'settings')}
		>
			<i class="fa-sharp-duotone fa-solid fa-gear"></i>
			{m.surveySettings()}
		</button>
	</div>

	{#if activeTab === 'results'}
		<SurveyResults conferenceId={params.conferenceId} surveyId={params.surveyId} />
	{/if}

	{#if activeTab === 'settings'}
		<SurveyDetailsCard conferenceId={params.conferenceId} surveyId={params.surveyId} />
		<SurveyOptionsEditor surveyId={params.surveyId} />
	{/if}
</div>
