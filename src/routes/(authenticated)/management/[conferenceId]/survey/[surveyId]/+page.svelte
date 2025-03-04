<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import formatNames from '$lib/services/formatNames';
	import type { PageData } from './$houdini';

	let { data }: { data: PageData } = $props();

	let surveysQuery = $derived(data?.SurveyResultsDetailsPage);
	let survey = $derived($surveysQuery.data?.findUniqueSurveyQuestion);

	let notAssignedParticipants = $derived($surveysQuery.data?.findManyUsers);
</script>

<div class="flex w-full flex-col gap-8 p-10">
	<h2 class="text-2xl font-bold">{survey?.title}</h2>
	{#each survey?.options ?? [] as option}
		{@const users = survey?.surveyAnswers
			.filter((answer) => answer.option.id === option.id)
			.sort((a, b) =>
				formatNames(a.user.given_name, a.user.family_name, { givenNameFirst: false }).localeCompare(
					formatNames(b.user.given_name, b.user.family_name, { givenNameFirst: false })
				)
			)}
		<div class="flex w-full flex-col rounded-lg bg-base-200 p-4">
			<div class="flex gap-2">
				<div class="flex w-full flex-1 flex-col">
					<h3>{option.title}</h3>
					<h4 class="text-xs">{option.description}</h4>
				</div>
				<h3>
					<span class="font-bold">{option.countSurveyAnswers}</span>
					{#if option.upperLimit > 0}
						&nbsp;/&nbsp;<span class="text-xs">{option.upperLimit}</span>
					{/if}
				</h3>
			</div>
			<div class="mt-4 rounded bg-base-300 p-2 text-sm shadow-sm">
				<div class="columns-1 sm:columns-2 md:columns-3 xl:columns-4">
					{#each users ?? [] as u}
						<p>
							<a
								href="/management/{data.conferenceId}/participants?filter={u.user.id}"
								class="hover:underline">{formatNames(u.user.given_name, u.user.family_name)}</a
							>
						</p>
					{/each}
				</div>
			</div>
		</div>
	{/each}

	<h2 class="text-2xl font-bold">{m.notAssignedParticipants()}</h2>
	<div class="flex w-full flex-col rounded-lg bg-base-200 p-4 text-sm">
		<div class="columns-1 sm:columns-2 md:columns-3 xl:columns-4">
			{#each notAssignedParticipants ?? [] as user}
				<p>
					<a
						href="/management/{data.conferenceId}/participants?filter={user.id}"
						class="hover:underline">{formatNames(user.given_name, user.family_name)}</a
					>
				</p>
			{/each}
		</div>
	</div>
</div>
