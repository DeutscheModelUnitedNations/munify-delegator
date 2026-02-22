<script lang="ts">
	import { graphql, type MediaConsentStatus$options } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { downloadCSV } from '$lib/services/downloadHelpers';
	import DownloadButton from './DownloadButton.svelte';

	interface Props {
		committees: {
			id: string;
			name: string;
			abbreviation: string;
		}[];
		conferenceId: string;
	}

	let { committees, conferenceId }: Props = $props();

	let loadingStates = $state<Record<string, boolean>>({});

	const setLoading = (key: string, value: boolean) => {
		loadingStates = { ...loadingStates, [key]: value };
	};

	const committeeBadgeDataDownloadQuery = graphql(`
		query CommitteeBadgeDataDownloadQuery($committeeId: String!) {
			findUniqueCommittee(where: { id: $committeeId }) {
				id
				abbreviation
				delegationMembers {
					id
					user {
						id
						given_name
						family_name
						pronouns
						conferenceParticipantStatus {
							id
							mediaConsentStatus
							conference {
								id
							}
						}
					}
					delegation {
						id
						assignedNation {
							alpha2Code
							alpha3Code
						}
					}
				}
			}
		}
	`);

	const nonStateActorBadgeDataDownloadQuery = graphql(`
		query NSABadgeDataDownloadQuery($conferenceId: String!) {
			findManyDelegationMembers(
				where: {
					conferenceId: { equals: $conferenceId }
					delegation: { assignedNonStateActorId: { not: { equals: null } } }
				}
			) {
				id
				user {
					id
					given_name
					family_name
					pronouns
					conferenceParticipantStatus {
						id
						mediaConsentStatus
						conference {
							id
						}
					}
				}
				delegation {
					id
					assignedNonStateActor {
						id
						name
						abbreviation
					}
				}
			}
		}
	`);

	const singleParticipantsBadgeDataDownloadQuery = graphql(`
		query SingleParticipantsBadgeDataDownloadQuery($conferenceId: String!) {
			findManySingleParticipants(
				where: {
					conferenceId: { equals: $conferenceId }
					assignedRoleId: { not: { equals: null } }
				}
			) {
				id
				user {
					id
					given_name
					family_name
					pronouns
					conferenceParticipantStatus {
						id
						mediaConsentStatus
						conference {
							id
						}
					}
				}
				assignedRole {
					name
				}
			}
		}
	`);

	const supervisorBadgeDataDownloadQuery = graphql(`
		query SupervisorBadgeDataDownloadQuery($conferenceId: String!) {
			findManyConferenceSupervisors(where: { conferenceId: { equals: $conferenceId } }) {
				id
				user {
					id
					given_name
					family_name
					pronouns
					conferenceParticipantStatus {
						id
						mediaConsentStatus
						conference {
							id
						}
					}
				}
				supervisedDelegationMembers {
					delegation {
						applied
						assignedNation {
							alpha3Code
						}
						assignedNonStateActor {
							id
						}
					}
				}
				supervisedSingleParticipants {
					applied
					assignedRole {
						id
					}
				}
			}
		}
	`);

	const teamMemberBadgeDataDownloadQuery = graphql(`
		query TeamMemberBadgeDataDownloadQuery($conferenceId: String!) {
			findManyTeamMembers(where: { conferenceId: { equals: $conferenceId } }) {
				id
				user {
					id
					given_name
					family_name
					pronouns
				}
			}
		}
	`);

	const exportBadgeCSV = (
		badgeData: {
			name: string;
			committee?: string | null;
			countryName: string;
			countryAlpha2Code?: string | null;
			alternativeImage?: string | null;
			pronouns?: string | null;
			id?: string | null;
			mediaConsentStatus?: MediaConsentStatus$options;
		}[],
		filename: string
	) => {
		const header = [
			'name',
			'committee',
			'countryName',
			'countryAlpha2Code',
			'alternativeImage',
			'pronouns',
			'id',
			'mediaConsentStatus'
		];
		const data = badgeData.map((x) => [
			x.name,
			x.committee ?? '',
			x.countryName,
			x.countryAlpha2Code ?? '',
			x.alternativeImage ?? '',
			x.pronouns ?? '',
			x.id ?? '',
			x.mediaConsentStatus ?? 'NOT_SET'
		]);
		downloadCSV(header, data, filename);
	};

	const getCommitteeBadgeData = async (committeeId: string) => {
		const key = `committee-${committeeId}`;
		setLoading(key, true);
		try {
			const res = await committeeBadgeDataDownloadQuery.fetch({ variables: { committeeId } });
			const resData = res.data?.findUniqueCommittee;

			if (res.errors || !resData) {
				console.error(res.errors);
				alert(m.httpGenericError());
				return;
			}

			const badgeData = resData.delegationMembers
				.filter((member) => !!member.delegation.assignedNation)
				.sort((a, b) => {
					const countryCompare = getFullTranslatedCountryNameFromISO3Code(
						a.delegation.assignedNation!.alpha3Code
					).localeCompare(
						getFullTranslatedCountryNameFromISO3Code(b.delegation.assignedNation!.alpha3Code)
					);
					if (countryCompare !== 0) return countryCompare;
					return a.user.family_name.localeCompare(b.user.family_name);
				})
				.map((member) => ({
					name: formatNames(member.user.given_name, member.user.family_name, {
						familyNameUppercase: false
					}),
					committee: resData.abbreviation,
					countryName: getFullTranslatedCountryNameFromISO3Code(
						member.delegation.assignedNation!.alpha3Code
					),
					countryAlpha2Code: member.delegation.assignedNation!.alpha2Code,
					alternativeImage: '',
					pronouns: member.user.pronouns,
					id: member.user.id,
					mediaConsentStatus:
						member.user.conferenceParticipantStatus.find((conference) => {
							return conference.conference.id === conferenceId;
						})?.mediaConsentStatus ?? 'NOT_SET'
				}));

			exportBadgeCSV(
				badgeData,
				`${resData.abbreviation}_badge_data_${new Date().toISOString()}.csv`
			);
		} finally {
			setLoading(key, false);
		}
	};

	const getNSAData = async () => {
		const key = 'nsa';
		setLoading(key, true);
		try {
			const res = await nonStateActorBadgeDataDownloadQuery.fetch({ variables: { conferenceId } });
			const resData = res.data?.findManyDelegationMembers;

			if (res.errors || !resData) {
				console.error(res.errors);
				alert(m.httpGenericError());
				return;
			}

			const badgeData = resData
				.filter((member) => !!member.delegation.assignedNonStateActor)
				.sort((a, b) => {
					const countryCompare = a.delegation.assignedNonStateActor!.name.localeCompare(
						b.delegation.assignedNonStateActor!.name
					);
					if (countryCompare !== 0) return countryCompare;
					return a.user.family_name.localeCompare(b.user.family_name);
				})
				.map((member) => ({
					name: formatNames(member.user.given_name, member.user.family_name, {
						familyNameUppercase: false
					}),
					countryName: member.delegation.assignedNonStateActor!.name,
					countryAlpha2Code: 'un',
					alternativeImage: '',
					pronouns: member.user.pronouns,
					id: member.user.id,
					mediaConsentStatus:
						member.user.conferenceParticipantStatus.find((conference) => {
							return conference.conference.id === conferenceId;
						})?.mediaConsentStatus ?? 'NOT_SET'
				}));

			exportBadgeCSV(badgeData, `NSA_badge_data_${new Date().toISOString()}.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const getSingleParticipantsData = async () => {
		const key = 'single';
		setLoading(key, true);
		try {
			const res = await singleParticipantsBadgeDataDownloadQuery.fetch({
				variables: { conferenceId }
			});
			const resData = res.data?.findManySingleParticipants;

			if (res.errors || !resData) {
				console.error(res.errors);
				alert(m.httpGenericError());
				return;
			}

			const badgeData = resData
				.filter((member) => !!member.assignedRole)
				.sort((a, b) => {
					const countryCompare = a.assignedRole!.name.localeCompare(b.assignedRole!.name);
					if (countryCompare !== 0) return countryCompare;
					return a.user.family_name.localeCompare(b.user.family_name);
				})
				.map((member) => ({
					name: formatNames(member.user.given_name, member.user.family_name, {
						familyNameUppercase: false
					}),
					countryName: member.assignedRole!.name,
					countryAlpha2Code: 'un',
					alternativeImage: '',
					pronouns: member.user.pronouns,
					id: member.user.id,
					mediaConsentStatus:
						member.user.conferenceParticipantStatus.find((conference) => {
							return conference.conference.id === conferenceId;
						})?.mediaConsentStatus ?? 'NOT_SET'
				}));

			exportBadgeCSV(badgeData, `single_participants_badge_data_${new Date().toISOString()}.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const getSupervisorData = async () => {
		const key = 'supervisors';
		setLoading(key, true);
		try {
			const res = await supervisorBadgeDataDownloadQuery.fetch({
				variables: { conferenceId }
			});
			const resData = res.data?.findManyConferenceSupervisors;

			if (res.errors || !resData) {
				console.error(res.errors);
				alert(m.httpGenericError());
				return;
			}

			const badgeData = resData
				.filter(
					(supervisor) =>
						supervisor.supervisedDelegationMembers.some(
							(dm) =>
								dm.delegation.applied &&
								(dm.delegation.assignedNation || dm.delegation.assignedNonStateActor)
						) || supervisor.supervisedSingleParticipants.some((sp) => sp.applied && sp.assignedRole)
				)
				.sort((a, b) => a.user.family_name.localeCompare(b.user.family_name))
				.map((supervisor) => ({
					name: formatNames(supervisor.user.given_name, supervisor.user.family_name, {
						familyNameUppercase: false
					}),
					countryName: m.supervisor(),
					countryAlpha2Code: '',
					alternativeImage: 'supervisor',
					pronouns: supervisor.user.pronouns,
					id: supervisor.user.id,
					mediaConsentStatus:
						supervisor.user.conferenceParticipantStatus.find((conference) => {
							return conference.conference.id === conferenceId;
						})?.mediaConsentStatus ?? 'NOT_SET'
				}));

			exportBadgeCSV(badgeData, `supervisors_badge_data_${new Date().toISOString()}.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const getTeamMemberData = async () => {
		const key = 'teamMembers';
		setLoading(key, true);
		try {
			const res = await teamMemberBadgeDataDownloadQuery.fetch({
				variables: { conferenceId }
			});
			const resData = res.data?.findManyTeamMembers;

			if (res.errors || !resData) {
				console.error(res.errors);
				alert(m.httpGenericError());
				return;
			}

			const badgeData = resData
				.sort((a, b) => a.user.family_name.localeCompare(b.user.family_name))
				.map((member) => ({
					name: formatNames(member.user.given_name, member.user.family_name, {
						familyNameUppercase: false
					}),
					countryName: m.teamBadge(),
					countryAlpha2Code: 'un',
					alternativeImage: '',
					pronouns: member.user.pronouns,
					id: member.user.id,
					mediaConsentStatus: 'ALLOWED_ALL' as const
				}));

			exportBadgeCSV(badgeData, `team_members_badge_data_${new Date().toISOString()}.csv`);
		} finally {
			setLoading(key, false);
		}
	};
</script>

{#each committees as committee (committee.id)}
	<DownloadButton
		onclick={() => getCommitteeBadgeData(committee.id)}
		title={committee.name}
		loading={loadingStates[`committee-${committee.id}`] ?? false}
	/>
{/each}
<DownloadButton
	onclick={() => getNSAData()}
	title={m.nonStateActors()}
	loading={loadingStates['nsa'] ?? false}
/>
<DownloadButton
	onclick={() => getSingleParticipantsData()}
	title={m.singleParticipants()}
	loading={loadingStates['single'] ?? false}
/>
<DownloadButton
	onclick={() => getSupervisorData()}
	title={m.supervisors()}
	loading={loadingStates['supervisors'] ?? false}
/>
<DownloadButton
	onclick={() => getTeamMemberData()}
	title={m.teamMembers()}
	loading={loadingStates['teamMembers'] ?? false}
/>
