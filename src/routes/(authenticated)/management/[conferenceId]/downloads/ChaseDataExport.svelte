<script lang="ts">
	import { graphql } from '$houdini';
	import DownloadElement from './DownloadElement.svelte';
	import DownloadSection from './DownloadSection.svelte';
	import { v4 as uuidv4 } from 'uuid';

	interface Props {
		loading: boolean;
		conferenceId: string;
	}

	let { loading = $bindable(), conferenceId }: Props = $props();

	const conferenceDataQuery = graphql(`
		query ConferenceDataQuery($conferenceId: String!) {
			findUniqueConference(where: { id: $conferenceId }) {
				id
				title
				committees {
					id
					name
					abbreviation
				}

				singleParticipants {
					id
					user {
						id
						email
					}
					assignedRole {
						id
					}
				}

				conferenceSupervisors {
					id
					user {
						id
						email
					}
				}

				nonStateActors {
					id
					name
					fontAwesomeIcon
				}

				delegationMembers {
					id
					assignedCommittee {
						id
					}
					user {
						id
						email
					}
					delegation {
						id
						assignedNation {
							alpha3Code
						}
						assignedNonStateActor {
							id
						}
					}
				}

				teamMembers {
					id
					role
					user {
						id
						email
					}
				}

				individualApplicationOptions {
					id
					name
					fontAwesomeIcon
				}
			}

			findManyNations {
				alpha2Code
				alpha3Code
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

	const getAndProcessData = async () => {
		loading = true;
		const data = (
			await conferenceDataQuery.fetch({
				variables: { conferenceId }
			})
		).data;

		const conferenceData = data?.findUniqueConference;
		if (!conferenceData) {
			loading = false;
			return;
		}

		// schema of this data is the input argument data to src/api/handlers/import.ts in munify-chase
		const transformedData = {
			id: conferenceData.id,
			title: conferenceData.title,
			committees: conferenceData.committees.map((committee) => ({
				id: committee.id,
				name: committee.name,
				abbreviation: committee.abbreviation
			})),
			representations: [
				...data.findManyNations.map((nation) => ({
					id: nation.alpha3Code,
					representationType: 'DELEGATION',
					alpha3Code: nation.alpha3Code,
					alpha2Code: nation.alpha2Code
				})),
				...conferenceData.nonStateActors.map((na) => ({
					id: na.id,
					representationType: 'NSA',
					name: na.name,
					faIcon: na.fontAwesomeIcon
				}))
			],
			//TODO
			conferenceMembers: [],
			committeeMembers: conferenceData.delegationMembers.map((dm) => ({
				id: dm.id,
				representationId:
					dm.delegation?.assignedNonStateActor?.id ?? dm.delegation?.assignedNation?.alpha3Code,
				committeeId: dm.assignedCommittee?.id
			})),
			conferenceUsers: [
				...conferenceData.teamMembers.map((tm) => ({
					id: tm.id,
					conferenceUserType: tm.role === "PROJECT_MANAGEMENT" ? 'ADMIN' : 'TEAM',
					userEmail: tm.user.email
				})),
				...conferenceData.conferenceSupervisors.map((supervisor) => ({
					id: supervisor.id,
					conferenceUserType: 'SPECTATOR',
					userEmail: supervisor.user.email
				})),
				...conferenceData.delegationMembers.map((dm) => ({
					id: uuidv4(),
					conferenceUserType: dm.delegation.assignedNation ? 'DELEGATE' : 'NON_STATE_ACTOR',
					userEmail: dm.user.email,
					committeeMemberId: dm.id,
					//TODO
					// conferenceMemberId: dm.id
				}))
			],
			agendaItems: []
		};

		downloadJSON(transformedData, `chase_import_${conferenceData.title}.json`);
		loading = false;
	};
</script>

<DownloadSection title="CHASE Seed Export">
	<DownloadElement btnClick={() => getAndProcessData()} title="Konferenz-Seed Daten" bind:loading />
</DownloadSection>
