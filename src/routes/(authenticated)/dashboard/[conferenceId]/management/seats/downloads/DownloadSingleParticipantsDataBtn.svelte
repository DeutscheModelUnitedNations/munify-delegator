<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import GenericDownloadButton from './GenericDownloadButton.svelte';
	import { downloadSemicolonCsv, fetchConferenceTitle, fileNamePrefix } from './seatDownloads';
	import { compareByText } from './sortRows';

	let { conferenceId }: { conferenceId: string } = $props();

	const downloadSingleParticipantData = async () => {
		const [participants, title] = await Promise.all([
			client.query.singleParticipants({
				__args: {
					where: {
						assignedRoleId: { isNotNull: true },
						conferenceId: { eq: conferenceId }
					}
				},
				id: true,
				assignedRole: { id: true, name: true },
				user: { id: true, givenName: true, familyName: true, email: true }
			}),
			fetchConferenceTitle(conferenceId)
		]);

		if (participants.length === 0) {
			alert('No data found');
			return;
		}

		downloadSemicolonCsv(
			[
				[m.name(), m.firstName(), m.lastName(), m.email()],
				...[...participants]
					.sort(compareByText((participant) => participant.assignedRole?.name))
					.map((participant) => [
						participant.assignedRole?.name,
						participant.user.givenName,
						participant.user.familyName,
						participant.user.email
					])
			],
			`${fileNamePrefix(title)}_single_participants.csv`
		);
	};
</script>

<GenericDownloadButton tip={m.singleParticipants()} getData={downloadSingleParticipantData} />
