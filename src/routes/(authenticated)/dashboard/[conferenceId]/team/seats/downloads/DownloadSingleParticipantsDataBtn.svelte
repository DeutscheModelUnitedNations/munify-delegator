<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
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
						conference: { id: { eq: conferenceId } }
					}
				},
				id: true,
				assignedRole: { id: true, name: true },
				user: { id: true, givenName: true, familyName: true, email: true }
			}),
			fetchConferenceTitle(conferenceId)
		]);

		if (participants.length === 0) {
			toast.error(m.noDataFound());
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
