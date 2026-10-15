<script lang="ts">
	import { toast } from 'svelte-sonner';
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

		if (members.length === 0) {
			toast.error(m.noDataFound());
			return;
		}

		downloadSemicolonCsv(
			[
				[m.name(), m.firstName(), m.lastName(), m.email()],
				...[...members]
					.sort(compareByText((member) => member.delegation.assignedRole?.abbreviation))
					.map((member) => [
						member.delegation.assignedRole?.abbreviation,
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
