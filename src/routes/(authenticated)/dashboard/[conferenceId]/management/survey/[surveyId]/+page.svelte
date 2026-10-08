<script lang="ts">
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
	<!-- Header -->
	<div class="flex w-full flex-col items-center justify-between gap-2 md:flex-row">
		<div class="flex flex-col gap-2">
			<h2 class="text-2xl font-bold">{survey?.title}</h2>
			<div class="flex flex-wrap items-center gap-2">
				{#if survey?.draft}
					<span class="badge badge-warning">{m.surveyIsDraft()}</span>
				{:else}
					<span class="badge badge-success">{m.surveyIsLive()}</span>
				{/if}
				{#if survey?.hidden}
					<span class="badge badge-neutral">
						<i class="fa-sharp-duotone fa-solid fa-box-archive mr-1"></i>
						{m.archivedSurvey()}
					</span>
				{/if}
			</div>
		</div>
		{#if survey}
			<div class="flex flex-wrap gap-2">
				<button class="btn {survey.draft ? 'btn-success' : 'btn-warning'}" onclick={toggleDraft}>
					<i class="fas {survey.draft ? 'fa-eye' : 'fa-eye-slash'}"></i>
					{survey.draft ? m.publishSurvey() : m.unpublishSurvey()}
				</button>
				<button class="btn btn-ghost" onclick={toggleHidden}>
					<i class="fa-sharp-duotone fa-solid fa-box-archive"></i>
					{survey.hidden ? m.unarchiveSurvey() : m.archiveSurvey()}
				</button>
			</div>
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

	{#if activeTab === 'results'}
		<SurveyResults conferenceId={params.conferenceId} surveyId={params.surveyId} />
	{/if}

	{#if activeTab === 'settings'}
		<SurveyDetailsCard conferenceId={params.conferenceId} surveyId={params.surveyId} />
		<SurveyOptionsEditor surveyId={params.surveyId} />
	{/if}
</div>
