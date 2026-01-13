<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { downloadCSV } from '$lib/services/downloadHelpers';
	import getNationRegionalGroup from '$lib/services/getNationRegionalGroup';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import DownloadButton from './DownloadButton.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	let loading = $state(false);

	const getAllConferenceNations = graphql(`
		query GetAllConferenceNations($conferenceId: String!) {
			getAllConferenceNations(conferenceId: $conferenceId) {
				alpha2Code
				alpha3Code
			}
		}
	`);

	const getAllNationsData = async () => {
		loading = true;
		try {
			const res = await getAllConferenceNations.fetch({
				variables: { conferenceId }
			});
			const resData = res.data?.getAllConferenceNations;

			if (res.errors || !resData) {
				console.error(res.errors);
				alert(m.httpGenericError());
				return;
			}

			const header = ['alpha2', 'alpha3', 'countryName', 'region'];
			const data = resData.map((nation) => [
				nation.alpha2Code,
				nation.alpha3Code,
				getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code),
				getNationRegionalGroup(nation.alpha3Code) ?? ''
			]);

			downloadCSV(header, data, `all_nations_${conferenceId}.csv`);
		} finally {
			loading = false;
		}
	};
</script>

<DownloadButton onclick={() => getAllNationsData()} title={m.allNations()} {loading} />
