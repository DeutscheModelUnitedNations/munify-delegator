<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
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
				delegation: { assignedRole: { nation: { alpha3Code: true } } },
				user: { givenName: true, familyName: true, email: true }
			}),
			fetchConferenceTitle(conferenceId)
		]);

		if (members.length === 0) {
			toast.error(m.noDataFound());
			return;
		}

		downloadSemicolonCsv(
			[
				[m.alpha3Code(), m.nation(), m.firstName(), m.lastName(), m.email()],
				...[...members]
					.map((member) => ({
						alpha3Code: member.delegation.assignedRole?.nation?.alpha3Code,
						user: member.user
					}))
					.sort(compareByText((member) => member.alpha3Code))
					.map(({ alpha3Code, user }) => [
						alpha3Code?.toUpperCase(),
						alpha3Code ? getFullTranslatedCountryNameFromISO3Code(alpha3Code) : '',
						user.givenName,
						user.familyName,
						user.email
					])
			],
			`${fileNamePrefix(title)}_${committee.abbreviation}_delegation_members.csv`
		);
	}
</script>

{#each committees as committee (committee.id)}
	<DownloadButton
		title="{committee.abbreviation} – {committee.name}"
		onclick={() => downloadCommitteeData(committee)}
	/>
{/each}
