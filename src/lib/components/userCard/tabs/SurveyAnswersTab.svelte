<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import SurveyAnswerCard from '../SurveyAnswerCard.svelte';

	interface Props {
		conferenceId: string;
		userId: string;
	}

	let { conferenceId, userId }: Props = $props();

	/** The conference's visible surveys and how this person answered them. */
	async function fetchSurveys(conferenceId: string, userId: string) {
		const [questions, answers] = await Promise.all([
			client.liveQuery.surveyQuestions({
				__args: { where: { conferenceId: { eq: conferenceId }, hidden: { eq: false } } },
				id: true,
				title: true,
				options: { id: true, title: true, countSurveyAnswers: true, upperLimit: true }
			}),
			client.liveQuery.surveyAnswers({
				__args: {
					where: {
						userId: { eq: userId },
						question: { conferenceId: { eq: conferenceId } }
					}
				},
				id: true,
				question: { id: true },
				option: { id: true, title: true }
			})
		]);
		return { questions, answers };
	}

	const surveys = $derived(await fetchSurveys(conferenceId, userId));
</script>

{#if surveys.questions.length === 0}
	<div class="alert alert-info">
		<i class="fa-duotone fa-chart-pie"></i>
		<span>{m.userCardNoSurveys()}</span>
	</div>
{:else}
	<div class="flex flex-col gap-3">
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
