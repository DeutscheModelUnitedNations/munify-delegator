<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';

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
		class="hover:bg-base-200 w-full cursor-pointer flex-row items-center gap-2 rounded-lg p-2 text-sm transition-all duration-300"
	>
		<input
			type="radio"
			id={'surveyOption-' + option.id}
			name="surveyOption"
			class="radio"
			disabled={loading}
			checked={surveyAnswer?.option.id === option.id}
			onchange={() => changeAnswer(option.id)}
		/>
		<div class="w-full flex-1">{option.title}</div>
		<div class="badge {fillClass(option)}">
			<span class="font-bold">{option.countSurveyAnswers}</span>
			{#if option.upperLimit > 0}
				&nbsp;/&nbsp;
				<span class="text-xs">{option.upperLimit}</span>
			{/if}
		</div>
	</label>
{/snippet}

<div class="card flex flex-col gap-2 p-4 shadow-md">
	<h3 class="w-full flex-1 font-bold">
		<i class="fa-duotone fa-poll mr-2"></i>
		{survey.title}
	</h3>
	{#if optionsOpen}
		<div class="flex flex-col">
			{#each survey.options as option (option.id)}
				{@render optionRow(option)}
			{/each}
		</div>
	{:else if surveyAnswer}
		<p>{surveyAnswer.option.title}</p>
	{:else}
		<p class="badge badge-error">{m.noAnswer()}</p>
	{/if}
	<div class="flex w-full gap-2">
		{#if !optionsOpen}
			<button class="btn btn-sm" onclick={() => (optionsOpen = true)}>
				<i class="fa-duotone fa-pencil"></i>{m.edit()}
			</button>
		{:else}
			<button class="btn btn-success btn-sm" onclick={() => (optionsOpen = false)}>
				<i class="fa-duotone fa-check"></i>{m.done()}
			</button>
		{/if}
		<a
			class="btn btn-sm"
			href={resolve('/(authenticated)/dashboard/[conferenceId]/management/survey/[surveyId]', {
				conferenceId,
				surveyId: survey.id
			})}
			aria-label="Edit Survey"
		>
			<i class="fa-duotone fa-arrow-up-right-from-square"></i>
		</a>
	</div>
</div>
