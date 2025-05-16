<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { stringify } from 'csv-stringify/browser/esm/sync';

	const getCommitteeUserData = graphql(`
		query getCommitteeUserData($id: String!) {
			findUniqueCommittee(where: { id: $id }) {
				id
				abbreviation
				name
				conference {
					id
					title
				}
				delegationMembers {
					id
					delegation {
						id
						assignedNation {
							alpha3Code
							alpha2Code
						}
					}
					user {
						id
						given_name
						family_name
						email
					}
				}
			}
		}
	`);

	interface Props {
		committee: {
			id: string;
			abbreviation: string;
			[key: string]: any;
		};
	}

	let { committee }: Props = $props();

	let loading = $state(false);

	const downloadCommitteeData = async () => {
		loading = true;
		const { data } = await getCommitteeUserData.fetch({ variables: { id: committee.id } });
		if (
			!data ||
			!data?.findUniqueCommittee ||
			!data?.findUniqueCommittee?.delegationMembers ||
			data?.findUniqueCommittee?.delegationMembers.length === 0
		) {
			alert('No data found');
			loading = false;
		}

		const csv = [
			[m.alpha3Code(), m.nation(), m.firstName(), m.lastName(), m.email()],
			...data!
				.findUniqueCommittee!.delegationMembers.sort((a, b) => {
					if (
						!a.delegation.assignedNation?.alpha3Code ||
						!b.delegation.assignedNation?.alpha3Code
					) {
						return 0;
					}
					return a.delegation.assignedNation?.alpha3Code.localeCompare(
						b.delegation.assignedNation?.alpha3Code
					);
				})
				.map((member) => [
					member.delegation.assignedNation?.alpha3Code.toUpperCase(),
					member.delegation.assignedNation?.alpha3Code
						? getFullTranslatedCountryNameFromISO3Code(member.delegation.assignedNation?.alpha3Code)
						: '',
					member.user.given_name,
					member.user.family_name,
					member.user.email
				])
		];

		const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${data!.findUniqueCommittee!.conference.title.replace(' ', '_')}_${committee.abbreviation}_delegation_members.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
		loading = false;
	};
</script>

<div class="tooltip" data-tip={m.downloadCommitteeData({ committee: committee.abbreviation })}>
	<button class="btn btn-ghost btn-sm" aria-label="Download data" onclick={downloadCommitteeData}>
		<i class="fa-duotone {loading ? 'fa-spinner fa-spin' : 'fa-download'}"></i>
	</button>
</div>
