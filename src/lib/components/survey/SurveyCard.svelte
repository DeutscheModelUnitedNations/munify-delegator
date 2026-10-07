<script lang="ts">
	import DeadlineDisplay from '$lib/components/DeadlineDisplay.svelte';
	import SurveyAnswerModal from './SurveyAnswerModal.svelte';
	import { m } from '$lib/paraglide/messages';

	interface SurveyOption {
		id: string;
		title: string;
		description: string;
		upperLimit: number;
		countSurveyAnswers: number;
	}

	interface Props {
		question: {
			id: string;
			title: string;
			description: string;
			deadline: Date | string;
			showSelectionOnDashboard: boolean;
			options: SurveyOption[];
		};
		answer: { option: { id: string; title: string } } | undefined;
		userId: string;
		conferenceTimezone: string;
	}

	let { question, answer, userId, conferenceTimezone }: Props = $props();

	let modalOpen = $state(false);
	let questionLocked = $derived(new Date(question.deadline) < new Date());
</script>

<div class="bg-base-200 flex flex-col gap-3 rounded-lg p-4">
	<DeadlineDisplay deadline={question.deadline} {conferenceTimezone} />
	<h3 class="text-lg font-bold">{question.title}</h3>
	{#if question.description}
		<p class="whitespace-pre-line text-sm opacity-70">{question.description}</p>
	{/if}

	<div
		class="bg-base-100 grid grid-cols-[auto_1fr] items-center gap-2 rounded-md p-3 shadow-sm {!answer &&
		!questionLocked
			? 'border-warning border'
			: ''}"
	>
		{#if answer}
			<i class="fa-solid fa-check-circle text-success"></i>
			<span class="font-semibold">{answer.option.title}</span>
		{:else}
			<i class="fa-solid fa-circle-exclamation text-warning"></i>
			<span class="text-warning">{m.noAnswerYet()}</span>
		{/if}
	</div>

	{#if !questionLocked}
		<button class="btn btn-primary btn-sm w-fit" onclick={() => (modalOpen = true)}>
			<i class="fa-solid fa-pen"></i>
			{answer ? m.changeAnswer() : m.takeSurvey()}
		</button>
	{/if}
</div>

<SurveyAnswerModal
	bind:open={modalOpen}
	{question}
	currentAnswerOptionId={answer?.option.id}
	{userId}
	{conferenceTimezone}
/>
