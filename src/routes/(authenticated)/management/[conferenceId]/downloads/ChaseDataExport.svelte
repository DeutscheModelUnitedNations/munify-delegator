<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { downloadJSON } from '$lib/services/downloadHelpers';
	import getNationRegionalGroup from '$lib/services/getNationRegionalGroup';
	import { nanoid } from 'nanoid';
	import { SvelteMap } from 'svelte/reactivity';
	import DownloadButton from './DownloadButton.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	let loading = $state(false);

	const conferenceDataQuery = graphql(`
		query ConferenceDataQuery($conferenceId: String!) {
			findUniqueConference(where: { id: $conferenceId }) {
				id
				title
				committees {
					id
					name
					abbreviation
					agendaItems {
						id
						title
					}
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
			}

			findManyNations {
				alpha2Code
				alpha3Code
			}
		}
	`);

	const getAndProcessData = async () => {
		loading = true;
		try {
			const data = (
				await conferenceDataQuery.fetch({
					variables: { conferenceId }
				})
			).data;

			const conferenceData = data?.findUniqueConference;
			if (!conferenceData) {
				alert(m.httpGenericError());
				return;
			}

			const transformRegionalGroup = (regionalGroup: string | undefined) => {
				switch (regionalGroup) {
					case 'African Group':
						return 'AFRICA';
					case 'Asia and the Pacific Group':
						return 'ASIA_PACIFIC';
					case 'Eastern European Group':
						return 'EASTERN_EUROPE';
					case 'Latin American and Caribbean Group':
						return 'LATIN_AMERICA_CARIBBEAN';
					case 'Western European and Others Group':
						return 'WESTERN_EUROPE_OTHERS';
					default:
						return undefined;
				}
			};
			// Build representation ID map first (needed by committeeMembers)
			const representationAlpha3CodeToIdMap = new SvelteMap<string, string>();
			const representations = [
				...data.findManyNations.map((nation) => {
					const id = nanoid(30);
					representationAlpha3CodeToIdMap.set(nation.alpha3Code, id);
					return {
						id,
						representationType: 'DELEGATION',
						alpha3Code: nation.alpha3Code,
						alpha2Code: nation.alpha2Code,
						regionalGroup: transformRegionalGroup(getNationRegionalGroup(nation.alpha3Code))
					};
				}),
				...conferenceData.nonStateActors.map((nonStateActor) => ({
					id: nonStateActor.id,
					representationType: 'NSA',
					name: nonStateActor.name,
					faIcon: nonStateActor.fontAwesomeIcon
				}))
			];

			// Build committeeMembers: one per unique (nation, committee) pair
			// Multiple delegates from the same nation in the same committee share one committeeMember
			const committeeMemberIdMap = new Map<string, string>();
			const committeeMembers: {
				id: string;
				representationId: string | undefined;
				committeeId: string | undefined;
			}[] = [];

			for (const dm of conferenceData.delegationMembers) {
				const alpha3Code = dm.delegation?.assignedNation?.alpha3Code;
				const committeeId = dm.assignedCommittee?.id;
				if (!alpha3Code || !committeeId) continue;

				const key = `${alpha3Code}_${committeeId}`;
				if (!committeeMemberIdMap.has(key)) {
					const id = nanoid(30);
					committeeMemberIdMap.set(key, id);
					committeeMembers.push({
						id,
						representationId: representationAlpha3CodeToIdMap.get(alpha3Code),
						committeeId
					});
				}
			}

			// schema of this data is the input argument data to src/api/handlers/import.ts in munify-chase
			const transformedData = {
				$schema: 'https://chase.munify.cloud/api/schema/import',
				id: conferenceData.id,
				title: conferenceData.title,
				committees: conferenceData.committees.map((committee) => ({
					id: committee.id,
					name: committee.name,
					abbreviation: committee.abbreviation
				})),
				representations,
				conferenceMembers: conferenceData.delegationMembers
					.filter((delegationMember) => delegationMember.delegation?.assignedNonStateActor?.id)
					.map((delegationMember) => ({
						id: delegationMember.id,
						representationId: delegationMember.delegation?.assignedNonStateActor?.id
					})),
				committeeMembers,
				conferenceUsers: [
					...conferenceData.teamMembers.map((teamMember) => ({
						id: teamMember.id,
						conferenceUserType: teamMember.role === 'PROJECT_MANAGEMENT' ? 'ADMIN' : 'TEAM',
						userEmail: teamMember.user.email
					})),
					...conferenceData.conferenceSupervisors.map((supervisor) => ({
						id: supervisor.id,
						conferenceUserType: 'SPECTATOR',
						userEmail: supervisor.user.email
					})),
					...conferenceData.delegationMembers
						.filter((delegationMember) => delegationMember.delegation?.assignedNonStateActor?.id)
						.map((delegationMember) => ({
							id: `${delegationMember.id}_user`,
							conferenceUserType: 'NON_STATE_ACTOR',
							userEmail: delegationMember.user.email,
							conferenceMemberId: delegationMember.id
						})),
					...conferenceData.delegationMembers
						.filter((delegationMember) => delegationMember.delegation?.assignedNation?.alpha3Code)
						.filter((delegationMember) => delegationMember.assignedCommittee?.id)
						.map((delegationMember) => ({
							id: `${delegationMember.id}_user`,
							conferenceUserType: 'DELEGATE',
							userEmail: delegationMember.user.email,
							committeeMemberId: committeeMemberIdMap.get(
								`${delegationMember.delegation?.assignedNation!.alpha3Code}_${delegationMember.assignedCommittee!.id}`
							)
						})),
					...conferenceData.singleParticipants
						.filter((sp) => sp.assignedRole?.id)
						.map((sp) => ({
							id: sp.id,
							conferenceUserType: 'SPECTATOR',
							userEmail: sp.user.email
						}))
				],
				agendaItems: conferenceData.committees.flatMap((committee) =>
					committee.agendaItems.map((item) => ({
						id: item.id,
						committeeId: committee.id,
						title: item.title
					}))
				)
			};

			downloadJSON(transformedData, `chase_import_${conferenceData.title}.json`);
		} finally {
			loading = false;
		}
	};
</script>

<DownloadButton
	onclick={() => getAndProcessData()}
	title={m.chaseSeedData()}
	icon="fas fa-file-code"
	{loading}
/>
