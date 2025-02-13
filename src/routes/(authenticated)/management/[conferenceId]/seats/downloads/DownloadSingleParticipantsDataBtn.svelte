<script lang="ts">
	import { graphql } from '$houdini';
	import * as m from '$lib/paraglide/messages';
	import { stringify } from 'csv-stringify/browser/esm/sync';
	import GenericDownloadButton from './GenericDownloadButton.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	const getCommitteeUserData = graphql(`
		query getSingleParticipantsUserData($conferenceId: String!) {
			findManySingleParticipants(
				where: {
					assignedRoleId: { not: { equals: null } }
					conferenceId: { equals: $conferenceId }
				}
			) {
				id
				assignedRole {
					name
				}
				conference {
					title
				}
				user {
					id
					given_name
					family_name
					email
				}
			}
		}
	`);

	let loading = $state(false);

	const downloadSingleParticipantData = async () => {
		loading = true;
		const { data } = await getCommitteeUserData.fetch({ variables: { conferenceId } });
		if (
			!data ||
			!data?.findManySingleParticipants ||
			data?.findManySingleParticipants?.length === 0
		) {
			alert('No data found');
			loading = false;
		}

		const csv = [
			[m.name(), m.firstName(), m.lastName(), m.email()],
			...data!
				.findManySingleParticipants!.sort((a, b) => {
					if (!a.assignedRole?.name || !b.assignedRole?.name) {
						return 0;
					}
					return a.assignedRole?.name.localeCompare(b.assignedRole?.name);
				})
				.map((participant) => [
					participant.assignedRole?.name,
					participant.user.given_name,
					participant.user.family_name,
					participant.user.email
				])
		];

		const blob = new Blob([stringify(csv)], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${data!.findManySingleParticipants![0].conference.title.replace(' ', '_')}_single_participants.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
		loading = false;
	};
</script>

<GenericDownloadButton tip={m.singleParticipants()} getData={downloadSingleParticipantData} />
