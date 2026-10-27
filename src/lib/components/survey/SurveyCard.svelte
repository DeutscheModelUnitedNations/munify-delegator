<script lang="ts">
	import DeadlineDisplay from '#lib/components/DeadlineDisplay.svelte';
	import SurveyAnswerModal from './SurveyAnswerModal.svelte';
	import { m } from '#lib/paraglide/messages.js';

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
	/** Still open and not answered: the one case that asks something of the participant. */
	let needsAnswer = $derived(!answer && !questionLocked);
	/** How the card looks: asking for an answer, answered, or closed without one. */
	const look = $derived(
		needsAnswer
			? { badge: 'bg-warning/15 text-warning', icon: 'fa-circle-exclamation' }
			: answer
				? { badge: 'bg-success/15 text-success', icon: 'fa-check' }
				: { badge: 'bg-base-300 text-base-content/50', icon: 'fa-lock' }
	);
	const border = $derived(
		needsAnswer
			? 'border-warning'
			: questionLocked
				? 'border-transparent opacity-70'
				: 'border-success'
	);
</script>

{#snippet actions()}
	{#if answer}
		<div class="bg-base-100 flex flex-col rounded-field px-3 py-1.5">
			<span class="text-base-content/60 text-xs">{m.yourAnswer()}</span>
			<span class="font-semibold">{answer.option.title}</span>
		</div>
	{:else if questionLocked}
		<span class="text-base-content/60 text-sm">{m.noAnswerYet()}</span>
	{/if}

	{#if !questionLocked}
		<button
			class="btn btn-sm {answer ? 'btn-ghost' : 'btn-warning'}"
			onclick={() => (modalOpen = true)}
		>
			<i class="fa-sharp-duotone fa-solid fa-pen"></i>
			{answer ? m.changeAnswer() : m.takeSurvey()}
		</button>
	{/if}
{/snippet}

<div
	class="bg-base-200 flex flex-col gap-3 rounded-box border-l-4 p-4 sm:flex-row sm:items-center sm:gap-4 {border}"
>
	<div
		class="flex size-10 shrink-0 items-center justify-center rounded-full max-sm:hidden {look.badge}"
	>
		<i class="fa-sharp-duotone fa-solid {look.icon}"></i>
	</div>

	<div class="flex min-w-0 flex-1 flex-col gap-1">
		<h3 class="font-bold leading-tight">{question.title}</h3>
		{#if question.description}
			<p class="text-base-content/70 whitespace-pre-line text-sm">{question.description}</p>
		{/if}
		<DeadlineDisplay deadline={question.deadline} {conferenceTimezone} plain />
	</div>

	<div class="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
		{@render actions()}
	</div>
</div>

<SurveyAnswerModal
	bind:open={modalOpen}
	{question}
	currentAnswerOptionId={answer?.option.id}
	{userId}
	{conferenceTimezone}
/>
