<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { fetchSurveys } from '../tabs/surveys';

	/** What the person chose in the conference's surveys. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const surveys = $derived(await fetchSurveys({ conferenceId, userId }));
	const answerOf = (questionId: string) =>
		surveys.answers.find((answer) => answer.question.id === questionId)?.option.title;
</script>

{#if surveys.questions.length === 0}
	<p class="text-base-content/60 italic">{m.userCardNoSurveys()}</p>
{:else}
	<dl class="flex flex-col gap-1">
		{#each surveys.questions as question (question.id)}
			{@const answer = answerOf(question.id)}
			<div>
				<dt class="text-base-content/60 text-xs">{question.title}</dt>
				<dd class={answer ? '' : 'text-warning'}>{answer ?? m.noAnswerYet()}</dd>
			</div>
		{/each}
	</dl>
{/if}
