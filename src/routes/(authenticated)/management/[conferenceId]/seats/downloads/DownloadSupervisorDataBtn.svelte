<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { stringify } from 'csv-stringify/browser/esm/sync';
	import GenericDownloadButton from './GenericDownloadButton.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	let loading = $state(false);

	const downloadSupervisorData = async () => {
		loading = true;
		try {
			const supervisors = await client.query.conferenceSupervisors({
				__args: { where: { conferenceId: { eq: conferenceId } } },
				id: true,
				conference: { title: true },
				user: { id: true, givenName: true, familyName: true, email: true }
			});

			if (supervisors.length === 0) {
				alert('No data found');
				return;
			}

			const csv = [
				[m.firstName(), m.lastName(), m.email()],
				...[...supervisors]
					.sort((a, b) => (a.user.familyName ?? '').localeCompare(b.user.familyName ?? ''))
					.map((supervisor) => [
						supervisor.user.givenName ?? '',
						supervisor.user.familyName ?? '',
						supervisor.user.email
					])
			];

			const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${supervisors[0].conference.title.replace(' ', '_')}_supervisors.csv`;
			a.click();
			window.URL.revokeObjectURL(url);
		} finally {
			loading = false;
		}
	};
</script>

<GenericDownloadButton tip={m.supervisors()} getData={downloadSupervisorData} />
