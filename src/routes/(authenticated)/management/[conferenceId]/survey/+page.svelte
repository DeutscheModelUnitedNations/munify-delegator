<script lang="ts">
	import type { SurveyResultsMainPage$result } from '$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$houdini';

	let { data }: { data: PageData } = $props();

	let surveysQuery = $derived(data.SurveyResultsMainPage);
	let surveys = $derived($surveysQuery.data?.findManySurveyQuestions);

	const getBarPercent = (
		option: SurveyResultsMainPage$result['findManySurveyQuestions'][0]['options'][0]
	) => {
		if (option.upperLimit === 0) {
			return 0;
		}
		return Math.min(Math.round((option.countSurveyAnswers / option.upperLimit) * 100), 100);
	};
</script>

<div class="flex flex-col gap-8 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.survey()}</h2>
	</div>
	{#each surveys ?? [] as survey}
		<div class="flex w-full flex-col gap-8 rounded-lg bg-base-200 p-4">
			<div class="grid grid-cols-[auto,1fr] items-center gap-2">
				<h3 class="col-span-2 text-xl font-bold">{survey.title}</h3>
				<i class="fa-duotone fa-info place-self-center"></i>
				<p>{survey.description}</p>
				<i class="fa-duotone fa-alarm-clock place-self-center"></i>
				<p>{survey.deadline.toLocaleString()}</p>
				<i class="fa-duotone fa-box-ballot place-self-center"></i>
				<p>{survey.draft ? m.surveyIsDraft() : m.surveyIsLive()}</p>
			</div>
			<div class="flex flex-col gap-4">
				{#each survey.options as option}
					<div class="relative flex w-full gap-2 p-2">
						<div
							class="absolute bottom-0 left-0 top-0 z-0 flex rounded-md {getBarPercent(option) ===
							100
								? 'bg-red-200 dark:bg-red-900'
								: 'bg-primary-200 dark:bg-primary-900'}"
							style="width: {getBarPercent(option)}%"
						></div>
						<h4 class="z-10 w-full flex-1">{option.title}</h4>
						<h4 class="z-10">
							<span class="font-bold">{option.countSurveyAnswers}</span>
							{#if option.upperLimit > 0}
								&nbsp;/&nbsp;
								<span class="text-xs">{option.upperLimit}</span>
							{/if}
						</h4>
					</div>
				{/each}
			</div>
			<a class="btn btn-primary" href="/management/{data.conferenceId}/survey/{survey.id}">
				{m.details()}
			</a>
		</div>
	{/each}
</div>
