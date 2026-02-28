<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import SurveyCard from '../../../../routes/(authenticated)/management/[conferenceId]/participants/SurveyCard.svelte';

	interface Props {
		surveyQuestions: Array<{
			id: string;
			title: string;
			options: Array<{
				id: string;
				title: string;
				countSurveyAnswers: number;
				upperLimit: number;
			}>;
		}>;
		surveyAnswers: Array<{
			id: string;
			question: { id: string; title: string };
			option: { id: string; title: string };
		}>;
		conferenceId: string;
		userId: string;
		onUpdate?: () => void;
	}

	let { surveyQuestions, surveyAnswers, conferenceId, userId, onUpdate }: Props = $props();
</script>

{#if surveyQuestions.length === 0}
	<div class="alert alert-info">
		<i class="fa-duotone fa-chart-pie"></i>
		<span>{m.userCardNoSurveys()}</span>
	</div>
{:else}
	<div class="flex flex-col gap-3">
		{#each surveyQuestions as survey (survey.id)}
			<SurveyCard
				{survey}
				surveyAnswer={surveyAnswers?.find((a) => a.question.id === survey.id)}
				{conferenceId}
				{userId}
			/>
		{/each}
	</div>
{/if}
