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

	const exportBadgeCSV = (
		badgeData: {
			name: string;
			committee?: string | null;
			countryName: string;
			countryAlpha2Code?: string | null;
			alternativeImage?: string | null;
			pronouns?: string | null;
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
			'mediaConsentStatus'
		];
		const data = badgeData.map((x) => [
			x.name,
			x.committee ?? '',
			x.countryName,
			x.countryAlpha2Code ?? '',
			x.alternativeImage ?? '',
			x.pronouns ?? '',
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
				.map((member) => ({
					name: formatNames(member.user.given_name, member.user.family_name, {
						familyNameUppercase: false
					}),
					countryName: member.delegation.assignedNonStateActor!.name,
					countryAlpha2Code: 'un',
					alternativeImage: '',
					pronouns: member.user.pronouns,
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
				.map((member) => ({
					name: formatNames(member.user.given_name, member.user.family_name, {
						familyNameUppercase: false
					}),
					countryName: member.assignedRole!.name,
					countryAlpha2Code: 'un',
					alternativeImage: '',
					pronouns: member.user.pronouns,
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
