<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { stringify } from 'csv-stringify/browser/esm/sync';

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
		try {
			const committeeData = await client.query.committee({
				__args: { id: committee.id },
				id: true,
				abbreviation: true,
				name: true,
				conference: { id: true, title: true },
				delegationMembers: {
					id: true,
					delegation: {
						id: true,
						assignedNation: { alpha3Code: true, alpha2Code: true }
					},
					user: { id: true, givenName: true, familyName: true, email: true }
				}
			});

			if (committeeData.delegationMembers.length === 0) {
				alert('No data found');
				return;
			}

			const csv = [
				[m.alpha3Code(), m.nation(), m.firstName(), m.lastName(), m.email()],
				...[...committeeData.delegationMembers]
					.sort((a, b) =>
						(a.delegation.assignedNation?.alpha3Code ?? '').localeCompare(
							b.delegation.assignedNation?.alpha3Code ?? ''
						)
					)
					.map((member) => [
						member.delegation.assignedNation?.alpha3Code.toUpperCase(),
						member.delegation.assignedNation?.alpha3Code
							? getFullTranslatedCountryNameFromISO3Code(
									member.delegation.assignedNation.alpha3Code
								)
							: '',
						member.user.givenName,
						member.user.familyName,
						member.user.email
					])
			];

			const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${committeeData.conference.title.replace(' ', '_')}_${committee.abbreviation}_delegation_members.csv`;
			a.click();
			window.URL.revokeObjectURL(url);
		} finally {
			loading = false;
		}
	};
</script>

<div class="tooltip" data-tip={m.downloadCommitteeData({ committee: committee.abbreviation })}>
	<button class="btn btn-ghost btn-sm" aria-label="Download data" onclick={downloadCommitteeData}>
		<i class="fa-duotone {loading ? 'fa-spinner fa-spin' : 'fa-download'}"></i>
	</button>
</div>
