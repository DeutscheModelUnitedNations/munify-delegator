<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { type PageData } from './$houdini';
	import SurveyEntry from './SurveyEntry.svelte';

	let { data }: { data: PageData } = $props();

	let userId = $derived(data.user.sub);
	let surveyData = $derived(data?.DashboardSurveyPageQuery);
	let isLoading = $derived($surveyData.fetching);
	let hasError = $derived($surveyData.errors && $surveyData.errors.length > 0);
	let surveyQuestions = $derived($surveyData.data?.findManySurveyQuestions ?? []);
	let surveyAnswers = $derived($surveyData.data?.findManySurveyAnswers ?? []);
</script>

<div class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.survey()}</h2>
	<p>{m.surveyDescription()}</p>

	{#if isLoading}
		<div class="mt-10 flex justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if hasError}
		<div class="alert alert-error mt-10">
			<i class="fa-solid fa-triangle-exclamation"></i>
			<span>{m.genericError()}</span>
		</div>
	{:else}
		<div class="mt-10 flex w-full max-w-3xl flex-col gap-4">
			{#each surveyQuestions as question}
				<SurveyEntry
					{question}
					answer={surveyAnswers.find((a) => a.question.id === question.id)}
					{userId}
				/>
			{/each}
		</div>
	{/if}
</div>
