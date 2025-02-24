<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { type PageData } from './$houdini';
	import SurveyEntry from './SurveyEntry.svelte';

	let { data }: { data: PageData } = $props();

	let userId = $derived(data.user.sub);
	let surveyData = $derived(data?.DashboardSurveyPageQuery);
	let surveyQuestions = $derived($surveyData.data?.findManySurveyQuestions ?? []);
	let surveyAnswers = $derived($surveyData.data?.findManySurveyAnswers ?? []);
</script>

<div class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.survey()}</h2>
	<p>{m.surveyDescription()}</p>

	<div class="mt-10 flex w-full max-w-3xl flex-col gap-4">
		{#each surveyQuestions as question}
			<SurveyEntry
				{question}
				answer={surveyAnswers.find((a) => a.question.id === question.id)}
				{userId}
			/>
		{/each}
	</div>
</div>
