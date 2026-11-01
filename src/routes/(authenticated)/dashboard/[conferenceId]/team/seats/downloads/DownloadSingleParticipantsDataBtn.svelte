<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import GenericDownloadButton from './GenericDownloadButton.svelte';
	import { downloadSortedCsv, fetchConferenceTitle, fileNamePrefix } from './seatDownloads';

	let { conferenceId }: { conferenceId: string } = $props();

	const downloadSingleParticipantData = async () => {
		const [participants, title] = await Promise.all([
			client.query.singleParticipants({
				__args: {
					where: {
						assignedRoleId: { isNotNull: true },
						conference: { id: { eq: conferenceId } }
					}
				},
				id: true,
				assignedRole: { id: true, name: true },
				user: { id: true, givenName: true, familyName: true, email: true }
			}),
			fetchConferenceTitle(conferenceId)
		]);

		downloadSortedCsv({
			items: participants,
			header: [m.name(), m.firstName(), m.lastName(), m.email()],
			sortKey: (participant) => participant.assignedRole?.name,
			row: (participant) => [
				participant.assignedRole?.name,
				participant.user.givenName,
				participant.user.familyName,
				participant.user.email
			],
			filename: `${fileNamePrefix(title)}_single_participants.csv`
		});
	};
</script>

<GenericDownloadButton tip={m.singleParticipants()} getData={downloadSingleParticipantData} />
