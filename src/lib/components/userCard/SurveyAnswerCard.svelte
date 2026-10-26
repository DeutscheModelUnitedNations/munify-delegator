<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		survey: {
			id: string;
			title: string;
			options: { id: string; title: string; countSurveyAnswers: number; upperLimit: number }[];
		};
		surveyAnswer?: { id: string; option: { id: string; title: string } };
		conferenceId: string;
		userId: string;
	}

	let { survey, surveyAnswer, conferenceId, userId }: Props = $props();

	let optionsOpen = $state(false);
	let loading = $state(false);

	const changeAnswer = async (optionId: string) => {
		loading = true;
		try {
			await client.mutate.updateSurveyAnswer({
				__args: { questionId: survey.id, userId, optionId },
				id: true,
				option: { id: true, title: true }
			});
		} finally {
			loading = false;
		}
	};

	type Option = Props['survey']['options'][number];

	/** Red once an option is full, amber within five seats of it; unlimited options stay plain. */
	const fillClass = (option: Option) => {
		if (option.upperLimit === 0) return '';
		if (option.countSurveyAnswers >= option.upperLimit) return 'badge-error';
		return option.countSurveyAnswers >= option.upperLimit - 5 ? 'badge-warning' : '';
	};
</script>

{#snippet optionRow(option: Option)}
	<label
		class="hover:bg-base-300 rounded-field flex cursor-pointer items-center gap-3 px-2 py-1.5 transition-colors"
	>
		<input
			type="radio"
			name={'surveyOption-' + survey.id}
			class="radio radio-sm"
			disabled={loading}
			checked={surveyAnswer?.option.id === option.id}
			onchange={() => changeAnswer(option.id)}
		/>
		<span class="grow">{option.title}</span>
		<span class="badge badge-sm font-mono {fillClass(option)}">
			<span class="font-bold">{option.countSurveyAnswers}</span>
			{#if option.upperLimit > 0}
				<span class="opacity-70">/ {option.upperLimit}</span>
			{/if}
		</span>
	</label>
{/snippet}

<div class="flex flex-col gap-2 px-4 py-3">
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
		<i class="fa-sharp-duotone fa-solid fa-poll text-base-content/60 w-6 text-center text-lg"></i>
		<div class="flex min-w-48 grow flex-col">
			<span class="font-semibold">{survey.title}</span>
			{#if surveyAnswer}
				<span class="text-sm">
					<i class="fa-sharp-duotone fa-solid fa-circle-check text-success mr-1"></i>
					{surveyAnswer.option.title}
				</span>
			{:else}
				<span class="text-error text-sm">
					<i class="fa-sharp-duotone fa-solid fa-circle-xmark mr-1"></i>
					{m.noAnswer()}
				</span>
			{/if}
		</div>
		<div class="join">
			<button
				class="btn btn-sm join-item {optionsOpen ? 'btn-success' : ''}"
				onclick={() => (optionsOpen = !optionsOpen)}
			>
				{#if optionsOpen}
					<i class="fa-sharp-duotone fa-solid fa-check"></i>{m.done()}
				{:else}
					<i class="fa-sharp-duotone fa-solid fa-pencil"></i>{m.edit()}
				{/if}
			</button>
			<a
				class="btn btn-sm btn-square join-item"
				href={resolve('/(authenticated)/dashboard/[conferenceId]/team/survey/[surveyId]', {
					conferenceId,
					surveyId: survey.id
				})}
				aria-label={m.a11yEditSurvey()}
				title={m.a11yEditSurvey()}
			>
				<i class="fa-sharp-duotone fa-solid fa-arrow-up-right-from-square"></i>
			</a>
		</div>
	</div>
	{#if optionsOpen}
		<div class="flex flex-col pl-8">
			{#each survey.options as option (option.id)}
				{@render optionRow(option)}
			{/each}
		</div>
	{/if}
</div>
