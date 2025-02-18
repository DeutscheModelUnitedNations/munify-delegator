<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { cache, graphql, type DashboardSurveyPageQuery$result } from '$houdini';
	import Modal from '$lib/components/Modal.svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		question: DashboardSurveyPageQuery$result['findManySurveyQuestions'][0];
		answer: DashboardSurveyPageQuery$result['findManySurveyAnswers'][0] | undefined;
		userId: string;
	}

	let { question, answer, userId }: Props = $props();

	let yourAnswer = $derived(question.options.find((option) => option.id === answer?.option.id));

	let newAnswer = $state<string>();

	$effect(() => {
		if (answer) newAnswer = answer?.id;
	});

	let questionLocked = $derived(new Date(question.deadline) < new Date());

	let modalOpen = $state(false);
	let loading = $state(false);

	const updateOneSurveyAnswerMutation = graphql(`
		mutation updateOneSurveyAnswer($userId: String!, $questionId: String!, $optionId: String!) {
			updateOneSurveyAnswer(
				where: { userId: $userId, questionId: $questionId }
				data: { optionId: $optionId }
			) {
				id
				question {
					id
				}
				option {
					id
					countSurveyAnswers
				}
			}
		}
	`);

	const updateChoice = async () => {
		if (!newAnswer) return;
		loading = true;
		await updateOneSurveyAnswerMutation.mutate({
			userId,
			questionId: question.id,
			optionId: newAnswer
		});
		cache.markStale();
		await invalidateAll();
		loading = false;
		modalOpen = false;
	};
</script>

<div class="flex flex-col gap-4 rounded-lg bg-base-200 p-4">
	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-2">
			{#if !questionLocked}
				<div class="badge {!answer && 'badge-warning'}">
					{m.surveyOpen({ deadline: new Date(question.deadline).toLocaleString() })}
				</div>
			{:else}
				<div class="badge {!answer && 'badge-error'}">{m.surveyClosed()}</div>
			{/if}
			<h3 class="text-xl font-bold">{question.title}</h3>
			<p>{question.description}</p>
		</div>
		<div
			class="grid grid-cols-[auto,1fr] items-center gap-2 rounded-md bg-base-100 p-4 shadow-md {!answer &&
				'bg-error'}"
		>
			{#if answer}
				<h5 class="col-span-2">{m.yourAnswer()}</h5>
				<i class="fa-duotone fa-arrow-right"></i>
				<h4 class="font-bold">{yourAnswer?.title}</h4>
				<p class="col-start-2 text-sm">{yourAnswer?.description}</p>
			{:else}
				{m.noAnswerYet()}
			{/if}
		</div>
	</div>
	<button
		class="btn btn-primary w-full lg:w-auto {questionLocked && 'disabled'}"
		onclick={() => (modalOpen = true)}
	>
		{m.takeSurvey()}
	</button>
</div>

{#snippet action()}
	<button class="btn btn-error" onclick={() => (modalOpen = false)}>{m.back()}</button>
	<button class="btn btn-success {!newAnswer && 'btn-disabled'}" onclick={updateChoice}>
		{#if loading}<i class="fas fa-spinner fa-spin"></i>{:else}<i class="fas fa-save"></i>{/if}
		{m.save()}
	</button>
{/snippet}

<Modal bind:open={modalOpen} title={question.title} fullWidth {action}>
	<p>{question.description}</p>

	<div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
		{#each question.options as option}
			{@const capacity = option.upperLimit
				? option.upperLimit - option.countSurveyAnswers
				: 99999999}
			<label
				class="items-between flex cursor-pointer gap-4 rounded-md bg-base-200 p-4 transition-all duration-300 hover:bg-base-300"
			>
				<input
					type="radio"
					name="surveyOption"
					class="radio-primary radio h-full"
					value={option.id}
					checked={yourAnswer?.id === option.id}
					onchange={(e) => (newAnswer = (e.target as HTMLInputElement).value)}
					disabled={capacity !== undefined ? capacity <= 0 : false}
				/>
				<div class="flex w-full flex-col items-start justify-between gap-2">
					<h3 class="font-bold">{option.title}</h3>
					{#if option.description}
						<p class="text-sm">{option.description}</p>
					{/if}
					<div
						class="{capacity === undefined || capacity > 5
							? 'bg-base-100'
							: capacity > 0
								? 'bg-warning'
								: 'bg-error'} flex w-auto items-center rounded-md p-2 text-sm"
					>
						<i class="{capacity === undefined || capacity > 5 ? 'fa-duotone' : 'fas'} fa-users mr-2"
						></i>
						{#if !option.upperLimit}
							<span>{option.countSurveyAnswers} ({m.noUpperLimit()})</span>
						{:else if capacity && capacity > 5}
							<span>{option.countSurveyAnswers}</span>
							{#if option.upperLimit}
								<span>&nbsp;{m.seatsOccupied({ seats: option.upperLimit })}</span>
							{/if}
						{:else if capacity && capacity > 0}
							<span
								>{m.fewSeatsLeft({
									seats: option.countSurveyAnswers,
									upperLimit: option.upperLimit
								})}</span
							>
						{:else}
							<span>{m.noSeatsLeft({ seats: option.countSurveyAnswers })}</span>
						{/if}
					</div>
				</div>
			</label>
		{/each}
	</div>
</Modal>
