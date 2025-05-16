<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { stringify } from 'csv-stringify/browser/esm/sync';
	import GenericDownloadButton from './GenericDownloadButton.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	const getCommitteeUserData = graphql(`
		query getSupervisorUserData($conferenceId: String!) {
			findManyConferenceSupervisors(where: { conferenceId: { equals: $conferenceId } }) {
				id
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

	const downloadSupervisorData = async () => {
		loading = true;
		const { data } = await getCommitteeUserData.fetch({ variables: { conferenceId } });
		if (
			!data ||
			!data?.findManyConferenceSupervisors ||
			data?.findManyConferenceSupervisors?.length === 0
		) {
			alert('No data found');
			loading = false;
		}

		const csv = [
			[m.firstName(), m.lastName(), m.email()],
			...data!
				.findManyConferenceSupervisors!.sort((a, b) => {
					return a.user.family_name.localeCompare(b.user.family_name);
				})
				.map((member) => [member.user.given_name, member.user.family_name, member.user.email])
		];

		const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${data!.findManyConferenceSupervisors![0].conference.title.replace(' ', '_')}_supervisors.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
		loading = false;
	};
</script>

<GenericDownloadButton tip={m.supervisors()} getData={downloadSupervisorData} />
