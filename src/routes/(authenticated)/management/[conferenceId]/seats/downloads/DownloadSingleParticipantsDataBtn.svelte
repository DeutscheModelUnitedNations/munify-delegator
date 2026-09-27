<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { stringify } from 'csv-stringify/browser/esm/sync';
	import GenericDownloadButton from './GenericDownloadButton.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	let loading = $state(false);

	const downloadSingleParticipantData = async () => {
		loading = true;
		try {
			const participants = await client.query.singleParticipants({
				__args: {
					where: {
						assignedRoleId: { isNotNull: true },
						conferenceId: { eq: conferenceId }
					}
				},
				id: true,
				assignedRole: { name: true },
				conference: { title: true },
				user: { id: true, givenName: true, familyName: true, email: true }
			});

			if (participants.length === 0) {
				alert('No data found');
				return;
			}

			const csv = [
				[m.name(), m.firstName(), m.lastName(), m.email()],
				...[...participants]
					.sort((a, b) => (a.assignedRole?.name ?? '').localeCompare(b.assignedRole?.name ?? ''))
					.map((participant) => [
						participant.assignedRole?.name,
						participant.user.givenName,
						participant.user.familyName,
						participant.user.email
					])
			];

			const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${participants[0].conference.title.replace(' ', '_')}_single_participants.csv`;
			a.click();
			window.URL.revokeObjectURL(url);
		} finally {
			loading = false;
		}
	};
</script>

<GenericDownloadButton tip={m.singleParticipants()} getData={downloadSingleParticipantData} />
