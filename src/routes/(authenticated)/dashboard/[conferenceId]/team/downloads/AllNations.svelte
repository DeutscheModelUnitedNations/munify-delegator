<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { downloadCSV } from '$lib/utils/downloadHelpers';
	import getNationRegionalGroup from '$lib/helpers/getNationRegionalGroup';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import DownloadButton from './DownloadButton.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	let loading = $state(false);

	const getAllNationsData = async () => {
		loading = true;
		try {
			const resData = await client.query.getAllConferenceNations({
				__args: { conferenceId },
				alpha2Code: true,
				alpha3Code: true
			});

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
