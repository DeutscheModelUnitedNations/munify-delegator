<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import GenericDownloadButton from './GenericDownloadButton.svelte';
	import { downloadSemicolonCsv, fetchConferenceTitle, fileNamePrefix } from './seatDownloads';

	let { conferenceId }: { conferenceId: string } = $props();

	const downloadSupervisorData = async () => {
		const [supervisors, title] = await Promise.all([
			client.query.conferenceSupervisors({
				__args: { where: { conferenceId: { eq: conferenceId } } },
				id: true,
				user: { id: true, givenName: true, familyName: true, email: true }
			}),
			fetchConferenceTitle(conferenceId)
		]);

		if (supervisors.length === 0) {
			alert('No data found');
			return;
		}

		downloadSemicolonCsv(
			[
				[m.firstName(), m.lastName(), m.email()],
				...[...supervisors]
					.sort((a, b) => (a.user.familyName ?? '').localeCompare(b.user.familyName ?? ''))
					.map((supervisor) => [
						supervisor.user.givenName ?? '',
						supervisor.user.familyName ?? '',
						supervisor.user.email
					])
			],
			`${fileNamePrefix(title)}_supervisors.csv`
		);
	};
</script>

<GenericDownloadButton tip={m.supervisors()} getData={downloadSupervisorData} />
