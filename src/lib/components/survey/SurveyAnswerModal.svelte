<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import Modal from '$lib/components/Modal.svelte';
	import DeadlineDisplay from '$lib/components/DeadlineDisplay.svelte';
	import { m } from '$lib/paraglide/messages';

	interface SurveyOption {
		id: string;
		title: string;
		description: string;
		upperLimit: number;
		countSurveyAnswers: number;
	}

	interface Props {
		open: boolean;
		question: {
			id: string;
			title: string;
			description: string;
			deadline: Date | string;
			options: SurveyOption[];
		};
		currentAnswerOptionId: string | undefined;
		userId: string;
		conferenceTimezone: string;
	}

	let {
		open = $bindable(),
		question,
		currentAnswerOptionId,
		userId,
		conferenceTimezone
	}: Props = $props();

	let newAnswer = $derived<string | undefined>(currentAnswerOptionId);
	let loading = $state(false);

	let questionLocked = $derived(new Date(question.deadline) < new Date());

	const updateChoice = async () => {
		if (!newAnswer || questionLocked || loading) return;
		loading = true;
		try {
			await client.mutate.updateSurveyAnswer({
				__args: { userId, questionId: question.id, optionId: newAnswer },
				id: true,
				question: { id: true },
				option: { id: true, countSurveyAnswers: true }
			});
			open = false;
		} finally {
			loading = false;
		}
	};

	/** Seats still free; an option without an upper limit never runs out. */
	const remainingCapacity = (option: SurveyOption) =>
		option.upperLimit ? option.upperLimit - option.countSurveyAnswers : 99999999;

	const capacityClass = (capacity: number) => {
		if (capacity > 5) return 'bg-base-100';
		return capacity > 0 ? 'bg-warning' : 'bg-error';
	};
</script>

{#snippet seats(option: SurveyOption, capacity: number)}
	{#if !option.upperLimit}
		<span>{option.countSurveyAnswers} ({m.noUpperLimit()})</span>
	{:else if capacity > 5}
		<span>{option.countSurveyAnswers}</span>
		<span>&nbsp;{m.seatsOccupied({ seats: option.upperLimit })}</span>
	{:else if capacity > 0}
		<span
			>{m.fewSeatsLeft({
				seats: option.countSurveyAnswers,
				upperLimit: option.upperLimit
			})}</span
		>
	{:else}
		<span>{m.noSeatsLeft({ seats: option.countSurveyAnswers })}</span>
	{/if}
{/snippet}

{#snippet optionCard(option: SurveyOption)}
	{@const capacity = remainingCapacity(option)}
	<label
		class="items-between bg-base-200 hover:bg-base-300 flex cursor-pointer gap-4 rounded-md p-4 transition-all duration-300"
	>
		<input
			type="radio"
			name="surveyOption"
			class="radio-primary radio h-full"
			value={option.id}
			checked={currentAnswerOptionId === option.id}
			onchange={(e) => (newAnswer = e.currentTarget.value)}
			disabled={capacity <= 0 || questionLocked}
		/>
		<div class="flex w-full flex-col items-start justify-between gap-2">
			<h3 class="font-bold">{option.title}</h3>
			{#if option.description}
				<p class="whitespace-pre-line text-sm">{option.description}</p>
			{/if}
			<div class="{capacityClass(capacity)} flex w-auto items-center rounded-md p-2 text-sm">
				<i class="fa-duotone fa-users mr-2"></i>
				{@render seats(option, capacity)}
			</div>
		</div>
	</label>
{/snippet}

{#snippet action()}
	<button class="btn" onclick={() => (open = false)}>{m.cancel()}</button>
	<button
		class="btn btn-primary"
		onclick={updateChoice}
		disabled={!newAnswer || questionLocked || loading}
	>
		{#if loading}<span class="loading loading-spinner loading-sm"></span>{/if}
		<i class="fa-duotone fa-save"></i>
		{m.save()}
	</button>
{/snippet}

<Modal bind:open title={question.title} fullWidth {action}>
	<div class="flex flex-col gap-4">
		<DeadlineDisplay deadline={question.deadline} {conferenceTimezone} />
		{#if question.description}
			<p class="whitespace-pre-line">{question.description}</p>
		{/if}

		{#if questionLocked}
			<div class="alert alert-warning">
				<i class="fa-duotone fa-lock"></i>
				{m.questionDeadlinePassed()}
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
			{#each question.options as option (option.id)}
				{@render optionCard(option)}
			{/each}
		</div>
	</div>
</Modal>
