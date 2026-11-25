<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import Empty from '../ui/Empty.svelte';
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
	<Empty icon="chart-pie" text={m.userCardNoSurveys()} />
{:else}
	{#each surveys.questions as survey (survey.id)}
		<SurveyAnswerCard
			{survey}
			surveyAnswer={surveys.answers.find((a) => a.question.id === survey.id)}
			{conferenceId}
			{userId}
		/>
	{/each}
{/if}
