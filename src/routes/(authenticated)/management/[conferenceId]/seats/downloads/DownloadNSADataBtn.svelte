<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { stringify } from 'csv-stringify/browser/esm/sync';
	import GenericDownloadButton from './GenericDownloadButton.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	const getCommitteeUserData = graphql(`
		query getNSAUserData($conferenceId: String!) {
			findManyDelegationMembers(
				where: {
					delegation: { assignedNonStateActorId: { not: null } }
					conferenceId: { equals: $conferenceId }
				}
			) {
				id
				delegation {
					assignedNonStateActor {
						abbreviation
					}
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

	const downloadNSAData = async () => {
		loading = true;
		const { data } = await getCommitteeUserData.fetch({ variables: { conferenceId } });
		if (
			!data ||
			!data?.findManyDelegationMembers ||
			data?.findManyDelegationMembers?.length === 0
		) {
			alert('No data found');
			loading = false;
		}

		const csv = [
			[m.name(), m.firstName(), m.lastName(), m.email()],
			...data!
				.findManyDelegationMembers!.sort((a, b) => {
					if (
						!a.delegation.assignedNonStateActor?.abbreviation ||
						!b.delegation.assignedNonStateActor?.abbreviation
					) {
						return 0;
					}
					return a.delegation.assignedNonStateActor?.abbreviation.localeCompare(
						b.delegation.assignedNonStateActor?.abbreviation
					);
				})
				.map((member) => [
					member.delegation.assignedNonStateActor?.abbreviation,
					member.user.given_name,
					member.user.family_name,
					member.user.email
				])
		];

		const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${data!.findManyDelegationMembers![0].conference.title.replace(' ', '_')}_nsa_members.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
		loading = false;
	};
</script>

<GenericDownloadButton tip={m.nonStateActors()} getData={downloadNSAData} />
