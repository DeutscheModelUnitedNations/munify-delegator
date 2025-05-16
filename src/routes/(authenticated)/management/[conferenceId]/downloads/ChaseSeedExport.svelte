<script lang="ts">
	import {
		graphql,
		type ConferenceCommitteeNationQuery,
		type ConferenceCommitteeNationQuery$result
	} from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import formatNames from '$lib/services/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { AdministrativeStatus } from '@prisma/client';
	import DownloadElement from './DownloadElement.svelte';
	import DownloadSection from './DownloadSection.svelte';
	import { stringify } from 'csv-stringify/browser/esm/sync';

	interface Props {
		loading: boolean;
		conferenceId: string;
	}

	let { loading = $bindable(), conferenceId }: Props = $props();

	const conferenceCommitteeNationQuery = graphql(`
		query ConferenceCommitteeNationQuery($conferenceId: String!) {
			findUniqueConference(where: { id: $conferenceId }) {
				id
				committees {
					id
					abbreviation
					nations {
						alpha3Code
						alpha2Code
					}
				}
				nonStateActors {
					abbreviation
					name
				}
			}
		}
	`);

	const downloadJSON = (data: Record<string, any>, filename: string) => {
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	const getConferenceCommitteeNationsData = async () => {
		loading = true;
		const data = await conferenceCommitteeNationQuery.fetch({
			variables: { conferenceId }
		});

		const conferenceData = data.data?.findUniqueConference;
		if (!conferenceData) {
			loading = false;
			return;
		}

		const delegations = conferenceData.committees.reduce((acc, committee) => {
			committee.nations.forEach((nation) => {
				acc.add(nation.alpha3Code);
			});
			return acc;
		}, new Set<string>());

		console.log(delegations.size);

		const committees = conferenceData.committees;

		const formattedData = {
			delegations: Array.from(delegations).map((nation) => {
				let committeePresence: {
					[key: string]: boolean;
				} = {};
				committees.forEach((committee) => {
					committeePresence[committee.abbreviation] = committee.nations.some(
						(n) => n.alpha3Code === nation
					);
				});

				return {
					alpha3Code: nation,
					...committeePresence
				};
			}),
			nonStateActors: conferenceData.nonStateActors
		};

		downloadJSON(formattedData, `RegistrationData_Delegation_${conferenceId}.json`);
		loading = false;
	};
</script>

<DownloadSection title="CHASE Seed Export">
	<DownloadElement
		btnClick={() => getConferenceCommitteeNationsData()}
		title="Konferenz-Seed Daten"
		bind:loading
	/>
</DownloadSection>
