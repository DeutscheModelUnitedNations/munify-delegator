<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import { downloadCSV } from '$lib/services/downloadHelpers';
	import DownloadButton from '../../downloads/DownloadButton.svelte';

	interface SurveyOption {
		id: string;
		title: string;
		description: string;
		countSurveyAnswers: number;
		upperLimit: number;
	}

	interface SurveyAnswer {
		id: string;
		option: { id: string };
		user: { id: string; given_name: string; family_name: string };
	}

	interface User {
		id: string;
		given_name: string;
		family_name: string;
	}

	interface Props {
		surveyTitle: string;
		options: SurveyOption[];
		surveyAnswers: SurveyAnswer[];
		notAnsweredParticipants: User[];
	}

	let { surveyTitle, options, surveyAnswers, notAnsweredParticipants }: Props = $props();

	let loadingStates = $state<Record<string, boolean>>({});

	const setLoading = (key: string, value: boolean) => {
		loadingStates = { ...loadingStates, [key]: value };
	};

	const downloadAllResults = () => {
		const key = 'all';
		setLoading(key, true);
		try {
			const header = [m.name(), m.surveyOption()];
			const data = surveyAnswers
				.map((answer) => {
					const option = options.find((o) => o.id === answer.option.id);
					return [
						formatNames(answer.user.given_name, answer.user.family_name, {
							givenNameFirst: false
						}),
						option?.title ?? ''
					];
				})
				.sort((a, b) => a[0].localeCompare(b[0]));

			downloadCSV(header, data, `${surveyTitle}_results.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const downloadNotAnswered = () => {
		const key = 'not-answered';
		setLoading(key, true);
		try {
			const header = [m.name()];
			const data = notAnsweredParticipants
				.map((user) => [formatNames(user.given_name, user.family_name, { givenNameFirst: false })])
				.sort((a, b) => a[0].localeCompare(b[0]));

			downloadCSV(header, data, `${surveyTitle}_not_answered.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const downloadByOption = (option: SurveyOption) => {
		const key = `option-${option.id}`;
		setLoading(key, true);
		try {
			const header = [m.name()];
			const data = surveyAnswers
				.filter((answer) => answer.option.id === option.id)
				.map((answer) => [
					formatNames(answer.user.given_name, answer.user.family_name, {
						givenNameFirst: false
					})
				])
				.sort((a, b) => a[0].localeCompare(b[0]));

			downloadCSV(header, data, `${surveyTitle}_${option.title}.csv`);
		} finally {
			setLoading(key, false);
		}
	};
</script>

<DownloadButton
	onclick={downloadAllResults}
	title={m.exportAllResults()}
	loading={loadingStates['all'] ?? false}
/>
<DownloadButton
	onclick={downloadNotAnswered}
	title={m.exportNotAnswered()}
	loading={loadingStates['not-answered'] ?? false}
/>
{#each options as option (option.id)}
	<DownloadButton
		onclick={() => downloadByOption(option)}
		title={m.exportByOption({ option: option.title })}
		loading={loadingStates[`option-${option.id}`] ?? false}
	/>
{/each}
