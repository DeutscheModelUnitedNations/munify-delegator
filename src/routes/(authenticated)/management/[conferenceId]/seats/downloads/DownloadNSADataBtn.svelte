<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { stringify } from 'csv-stringify/browser/esm/sync';
	import GenericDownloadButton from './GenericDownloadButton.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	let loading = $state(false);

	const downloadNSAData = async () => {
		loading = true;
		try {
			const members = await client.query.delegationMembers({
				__args: {
					where: {
						delegation: { assignedNonStateActorId: { isNotNull: true } },
						conferenceId: { eq: conferenceId }
					}
				},
				id: true,
				delegation: { assignedNonStateActor: { abbreviation: true } },
				conference: { title: true },
				user: { id: true, givenName: true, familyName: true, email: true }
			});

			if (members.length === 0) {
				alert('No data found');
				return;
			}

			const csv = [
				[m.name(), m.firstName(), m.lastName(), m.email()],
				...[...members]
					.sort((a, b) =>
						(a.delegation.assignedNonStateActor?.abbreviation ?? '').localeCompare(
							b.delegation.assignedNonStateActor?.abbreviation ?? ''
						)
					)
					.map((member) => [
						member.delegation.assignedNonStateActor?.abbreviation,
						member.user.givenName,
						member.user.familyName,
						member.user.email
					])
			];

			const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${members[0].conference.title.replace(' ', '_')}_nsa_members.csv`;
			a.click();
			window.URL.revokeObjectURL(url);
		} finally {
			loading = false;
		}
	};
</script>

<GenericDownloadButton tip={m.nonStateActors()} getData={downloadNSAData} />
