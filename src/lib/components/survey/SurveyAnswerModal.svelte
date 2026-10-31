<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import Modal from '#lib/components/Modal.svelte';
	import DeadlineDisplay from '#lib/components/DeadlineDisplay.svelte';
	import { m } from '#lib/paraglide/messages';
	import { saveWithToast } from '#lib/helpers/saveWithToast';

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
	const canSave = $derived(!!newAnswer && !questionLocked && !loading);

	const updateChoice = async () => {
		const optionId = newAnswer;
		if (!canSave || !optionId) return;
		// The option may have filled up since the modal opened: the API refuses, and says so.
		const saved = await saveWithToast({
			setLoading: (isLoading) => (loading = isLoading),
			write: async () => {
				await client.mutate.upsertSurveyAnswer({
					__args: { userId, questionId: question.id, optionId },
					id: true,
					question: { id: true },
					option: { id: true, countSurveyAnswers: true }
				});
			}
		});
		open = !saved;
	};

	/** Takes the answer back, so the question is open again for the person. */
	const withdrawAnswer = async () => {
		if (!currentAnswerOptionId || questionLocked || loading) return;
		const withdrawn = await saveWithToast({
			setLoading: (isLoading) => (loading = isLoading),
			write: async () => {
				await client.mutate.deleteSurveyAnswer({ __args: { userId, questionId: question.id } });
			}
		});
		open = !withdrawn;
	};

	/** Seats still free; an option without an upper limit never runs out. */
	const remainingCapacity = (option: SurveyOption) =>
		option.upperLimit ? option.upperLimit - option.countSurveyAnswers : 99999999;

	const capacityClass = (capacity: number) => {
		if (capacity > 5) return 'text-base-content/60';
		return capacity > 0 ? 'text-warning' : 'text-error';
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
	{@const selected = newAnswer === option.id}
	{@const disabled = capacity <= 0 || questionLocked}
	<label
		class="bg-base-200 relative flex flex-col items-start gap-2 rounded-field border-2 p-4 transition-[border-color,background-color,box-shadow] duration-300 has-focus-visible:outline-2 has-focus-visible:outline-primary {selected
			? 'border-success shadow-lg shadow-success/20'
			: 'border-transparent'} {disabled
			? 'cursor-not-allowed opacity-60'
			: 'hover:bg-base-300 cursor-pointer'}"
	>
		<input
			type="radio"
			name="surveyOption"
			class="sr-only"
			value={option.id}
			checked={currentAnswerOptionId === option.id}
			onchange={(e) => (newAnswer = e.currentTarget.value)}
			{disabled}
		/>
		<span
			class="absolute right-0 bottom-0 grid size-6 translate-x-1/2 translate-y-1/2 place-items-center rounded-full bg-success text-xs text-success-content transition-[scale,opacity] duration-300 {selected
				? 'scale-100 opacity-100 ease-[cubic-bezier(0.34,1.56,0.64,1)]'
				: 'scale-0 opacity-0 ease-in'}"
			aria-hidden="true"
		>
			<i class="fa-sharp-duotone fa-solid fa-check"></i>
		</span>
		<h3 class="font-bold">{option.title}</h3>
		{#if option.description}
			<p class="whitespace-pre-line text-sm">{option.description}</p>
		{/if}
		<p class="flex items-center text-sm {capacityClass(capacity)}">
			<i class="fa-sharp-duotone fa-solid fa-users mr-2"></i>
			{@render seats(option, capacity)}
		</p>
	</label>
{/snippet}

{#snippet action()}
	{#if currentAnswerOptionId && !questionLocked}
		<button class="btn btn-ghost text-error mr-auto" onclick={withdrawAnswer} disabled={loading}>
			<i class="fa-sharp-duotone fa-solid fa-eraser"></i>
			{m.withdrawSurveyAnswer()}
		</button>
	{/if}
	<button class="btn" onclick={() => (open = false)}>{m.cancel()}</button>
	<button class="btn btn-primary" onclick={updateChoice} disabled={!canSave}>
		{#if loading}<span class="loading loading-spinner loading-sm"></span>{/if}
		<i class="fa-sharp-duotone fa-solid fa-save"></i>
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
				<i class="fa-sharp-duotone fa-solid fa-lock"></i>
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
