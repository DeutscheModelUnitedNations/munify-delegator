<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import formatNames, { sortByNames } from '$lib/services/formatNames';
	import type { PageData } from './$houdini';
	import { stringify } from 'csv-stringify/browser/esm/sync';

	let { data }: { data: PageData } = $props();

	let surveysQuery = $derived(data?.SurveyResultsDetailsPage);
	let survey = $derived($surveysQuery.data?.findUniqueSurveyQuestion);

	let notAssignedParticipants = $derived($surveysQuery.data?.findManyUsers);

	const downloadCSV = async (header: string[], data: string[][], filename: string) => {
		const csv = [header, ...data];
		const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	const downloadResults = () => {
		const header = [m.name(), m.surveyOption()];
		const data =
			survey?.surveyAnswers
				.sort((a, b) => sortByNames(a.user, b.user))
				.map((answer) => [
					formatNames(answer.user.given_name, answer.user.family_name, { givenNameFirst: false }),
					survey?.options.find((option) => option.id === answer.option.id)?.title ?? ''
				]) ?? [];

		downloadCSV(header, data, `${survey?.title ?? 'survey'}_results.csv`);
	};
</script>

<div class="flex w-full flex-col gap-8 p-10">
	<div class="flex w-full flex-col items-center justify-between gap-2 md:flex-row">
		<h2 class="text-2xl font-bold">{survey?.title}</h2>
		<button class="btn btn-primary max-w-sm" onclick={downloadResults}>
			<i class="fas fa-download"></i>
			{m.downloadResults()}
		</button>
	</div>
	{#each survey?.options ?? [] as option}
		{@const users = survey?.surveyAnswers
			.filter((answer) => answer.option.id === option.id)
			.sort((a, b) =>
				formatNames(a.user.given_name, a.user.family_name, { givenNameFirst: false }).localeCompare(
					formatNames(b.user.given_name, b.user.family_name, { givenNameFirst: false })
				)
			)}
		<div class="bg-base-200 flex w-full flex-col rounded-lg p-4">
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
			<div class="bg-base-300 mt-4 rounded p-2 text-sm shadow-sm">
				<div class="columns-1 sm:columns-2 md:columns-3 xl:columns-4">
					{#each users ?? [] as u}
						<p>
							<a
								href="/management/{data.conferenceId}/participants?selected={u.user.id}"
								class="hover:underline">{formatNames(u.user.given_name, u.user.family_name)}</a
							>
						</p>
					{/each}
				</div>
			</div>
		</div>
	{/each}

	<h2 class="text-2xl font-bold">{m.notAssignedParticipants()}</h2>
	<div class="bg-base-200 flex w-full flex-col rounded-lg p-4 text-sm">
		<div class="columns-1 sm:columns-2 md:columns-3 xl:columns-4">
			{#each notAssignedParticipants ?? [] as user}
				<p>
					<a
						href="/management/{data.conferenceId}/participants?selected={user.id}"
						class="hover:underline">{formatNames(user.given_name, user.family_name)}</a
					>
				</p>
			{/each}
		</div>
	</div>
</div>
