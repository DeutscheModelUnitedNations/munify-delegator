<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import GenericDownloadButton from './GenericDownloadButton.svelte';
	import { downloadSortedCsv, fetchConferenceTitle, fileNamePrefix } from './seatDownloads';

	let { conferenceId }: { conferenceId: string } = $props();

	const downloadNSAData = async () => {
		const [members, title] = await Promise.all([
			client.query.delegationMembers({
				__args: {
					where: {
						delegation: { assignedRole: { kind: 'NON_STATE_ACTOR' } },
						conference: { id: { eq: conferenceId } }
					}
				},
				id: true,
				delegation: { id: true, assignedRole: { abbreviation: true } },
				user: { id: true, givenName: true, familyName: true, email: true }
			}),
			fetchConferenceTitle(conferenceId)
		]);

		downloadSortedCsv({
			items: members,
			header: [m.name(), m.firstName(), m.lastName(), m.email()],
			sortKey: (member) => member.delegation.assignedRole?.abbreviation,
			row: (member) => [
				member.delegation.assignedRole?.abbreviation,
				member.user.givenName,
				member.user.familyName,
				member.user.email
			],
			filename: `${fileNamePrefix(title)}_nsa_members.csv`
		});
	};
</script>

<GenericDownloadButton tip={m.nonStateActors()} getData={downloadNSAData} />
