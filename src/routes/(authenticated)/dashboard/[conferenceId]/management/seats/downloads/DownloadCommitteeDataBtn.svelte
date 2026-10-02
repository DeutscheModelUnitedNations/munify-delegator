<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { downloadSemicolonCsv, fetchConferenceTitle, fileNamePrefix } from './seatDownloads';
	import { compareByText } from './sortRows';

	interface Props {
		conferenceId: string;
		committeeId: string;
		abbreviation: string;
	}

	let { conferenceId, committeeId, abbreviation }: Props = $props();

	let loading = $state(false);

	const downloadCommitteeData = async () => {
		loading = true;
		try {
			const [members, title] = await Promise.all([
				client.query.delegationMembers({
					__args: { where: { assignedCommitteeId: { eq: committeeId } } },
					id: true,
					delegation: { id: true, assignedNation: { alpha3Code: true } },
					user: { id: true, givenName: true, familyName: true, email: true }
				}),
				fetchConferenceTitle(conferenceId)
			]);

			if (members.length === 0) {
				alert('No data found');
				return;
			}

			downloadSemicolonCsv(
				[
					[m.alpha3Code(), m.nation(), m.firstName(), m.lastName(), m.email()],
					...[...members]
						.sort(compareByText((member) => member.delegation.assignedNation?.alpha3Code))
						.map((member) => [
							member.delegation.assignedNation?.alpha3Code.toUpperCase(),
							member.delegation.assignedNation?.alpha3Code
								? getFullTranslatedCountryNameFromISO3Code(
										member.delegation.assignedNation.alpha3Code
									)
								: '',
							member.user.givenName,
							member.user.familyName,
							member.user.email
						])
				],
				`${fileNamePrefix(title)}_${abbreviation}_delegation_members.csv`
			);
		} finally {
			loading = false;
		}
	};
</script>

<div class="tooltip" data-tip={m.downloadCommitteeData({ committee: abbreviation })}>
	<button class="btn btn-ghost btn-sm" aria-label="Download data" onclick={downloadCommitteeData}>
		<i class="fa-duotone {loading ? 'fa-spinner fa-spin' : 'fa-download'}"></i>
	</button>
</div>
