<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import SurveyAnswerCard from '../SurveyAnswerCard.svelte';
	import { fetchSurveys } from '../tabs/surveys';

	interface Props {
		conferenceId: string;
		userId: string;
	}

	let { conferenceId, userId }: Props = $props();

	const surveys = $derived(await fetchSurveys({ conferenceId, userId }));
</script>

{#if surveys.questions.length === 0}
	<div class="alert alert-info">
		<i aria-hidden="true" class="ph-duotone ph-chart-pie"></i>
		<span>{m.userCardNoSurveys()}</span>
	</div>
{:else}
	<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
		{#each surveys.questions as survey (survey.id)}
			<SurveyAnswerCard
				{survey}
				surveyAnswer={surveys.answers.find((a) => a.question.id === survey.id)}
				{conferenceId}
				{userId}
			/>
		{/each}
	</div>
{/if}
