<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import GenericDownloadButton from './GenericDownloadButton.svelte';
	import { downloadSemicolonCsv, fetchConferenceTitle, fileNamePrefix } from './seatDownloads';
	import { compareByText } from './sortRows';

	let { conferenceId }: { conferenceId: string } = $props();

	const downloadNSAData = async () => {
		const [members, title] = await Promise.all([
			client.query.delegationMembers({
				__args: {
					where: {
						delegation: { assignedNonStateActorId: { isNotNull: true } },
						conferenceId: { eq: conferenceId }
					}
				},
				id: true,
				delegation: { id: true, assignedNonStateActor: { id: true, abbreviation: true } },
				user: { id: true, givenName: true, familyName: true, email: true }
			}),
			fetchConferenceTitle(conferenceId)
		]);

		if (members.length === 0) {
			alert('No data found');
			return;
		}

		downloadSemicolonCsv(
			[
				[m.name(), m.firstName(), m.lastName(), m.email()],
				...[...members]
					.sort(compareByText((member) => member.delegation.assignedNonStateActor?.abbreviation))
					.map((member) => [
						member.delegation.assignedNonStateActor?.abbreviation,
						member.user.givenName,
						member.user.familyName,
						member.user.email
					])
			],
			`${fileNamePrefix(title)}_nsa_members.csv`
		);
	};
</script>

<GenericDownloadButton tip={m.nonStateActors()} getData={downloadNSAData} />
