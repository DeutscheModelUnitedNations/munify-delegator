<script lang="ts">
	import { graphql } from '$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import formatNames from '$lib/services/formatNames';
	import getNationRegionalGroup from '$lib/services/getNationRegionalGroup';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import DownloadElement from './DownloadElement.svelte';
	import DownloadSection from './DownloadSection.svelte';
	import { stringify } from 'csv-stringify/browser/esm/sync';

	interface Props {
		loading: boolean;
		conferenceId: string;
	}

	let { loading = $bindable(), conferenceId }: Props = $props();

	const getAllConferenceNations = graphql(`
		query GetAllConferenceNations($conferenceId: String!) {
			getAllConferenceNations(conferenceId: $conferenceId) {
				alpha2Code
				alpha3Code
			}
		}
	`);

	const downloadCSV = (nationData: { alpha2Code: string; alpha3Code: string }[]) => {
		const header = ['alpha2', 'alpha3', 'countryName', 'region'];
		const csv = [
			header,
			...nationData.map((nation: { alpha2Code: string; alpha3Code: string }) => [
				nation.alpha2Code,
				nation.alpha3Code,
				getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code),
				getNationRegionalGroup(nation.alpha3Code) ?? ''
			])
		];
		const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `all_nations_${conferenceId}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// Refactored function for single participants badge data download
	const getAllNationsData = async () => {
		loading = true;
		const res = await getAllConferenceNations.fetch({
			variables: { conferenceId }
		});
		const resData = res.data?.getAllConferenceNations;

		if (res.errors || !resData) {
			console.error(res.errors);
			alert(m.httpGenericError());
			loading = false;
			return;
		}

		downloadCSV(resData);
		loading = false;
	};
</script>

<DownloadSection title={m.allNations()}>
	<DownloadElement btnClick={() => getAllNationsData()} title={m.allNations()} bind:loading />
</DownloadSection>
