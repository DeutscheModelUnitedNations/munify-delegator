<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import {
		downloadSemicolonCsv,
		fetchConferenceTitle,
		fileNamePrefix
	} from '../seats/downloads/seatDownloads';
	import { compareByText } from '../seats/downloads/sortRows';
	import DownloadButton from './DownloadButton.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const committees = $derived(
		await client.liveQuery.committees({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			name: true,
			abbreviation: true
		})
	);

	async function downloadCommitteeData(committee: { id: string; abbreviation: string }) {
		const [members, title] = await Promise.all([
			client.query.delegationMembers({
				__args: { where: { assignedCommitteeId: { eq: committee.id } } },
				delegation: { assignedNation: { alpha3Code: true } },
				user: { givenName: true, familyName: true, email: true }
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
			`${fileNamePrefix(title)}_${committee.abbreviation}_delegation_members.csv`
		);
	}
</script>

<div class="flex flex-wrap gap-2">
	{#each committees as committee (committee.id)}
		<DownloadButton
			title="{committee.abbreviation} – {committee.name}"
			onclick={() => downloadCommitteeData(committee)}
		/>
	{/each}
</div>
