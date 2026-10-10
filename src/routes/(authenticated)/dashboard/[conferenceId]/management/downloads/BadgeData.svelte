<script lang="ts">
	import { client, type MediaconsentstatusEnum } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { downloadCSV } from '$lib/utils/downloadHelpers';
	import DownloadButton from './DownloadButton.svelte';
	import { badgeHeader, badgeRow, compareByFamilyName, type Badge } from './exportFormatting';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const committees = $derived(
		await client.liveQuery.committees({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			name: true
		})
	);

	// Only this conference's status row, not every conference the person ever attended.
	function badgeUser() {
		return {
			id: true,
			givenName: true,
			familyName: true,
			pronouns: true,
			conferenceParticipantStatus: {
				__args: { where: { conferenceId: { eq: conferenceId } } },
				id: true,
				mediaConsentStatus: true
			}
		} as const;
	}

	function fetchCommitteeBadgeData(committeeId: string) {
		return client.query.committee({
			__args: { id: committeeId },
			id: true,
			abbreviation: true,
			delegationMembers: {
				id: true,
				user: badgeUser(),
				delegation: {
					id: true,
					assignedNation: { alpha2Code: true, alpha3Code: true }
				}
			}
		});
	}

	function fetchNsaBadgeData() {
		return client.query.delegationMembers({
			__args: {
				where: {
					conferenceId: { eq: conferenceId },
					delegation: { assignedNonStateActorId: { isNotNull: true } }
				}
			},
			id: true,
			user: badgeUser(),
			delegation: {
				id: true,
				assignedNonStateActor: { id: true, name: true, abbreviation: true }
			}
		});
	}

	function fetchSingleParticipantBadgeData() {
		return client.query.singleParticipants({
			__args: {
				where: {
					conferenceId: { eq: conferenceId },
					assignedRoleId: { isNotNull: true }
				}
			},
			id: true,
			user: badgeUser(),
			assignedRole: { name: true }
		});
	}

	function fetchSupervisorBadgeData() {
		return client.query.conferenceSupervisors({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			user: badgeUser(),
			supervisedDelegationMembers: {
				delegation: {
					applied: true,
					assignedNation: { alpha3Code: true },
					assignedNonStateActor: { id: true }
				}
			},
			supervisedSingleParticipants: { applied: true, assignedRole: { id: true } }
		});
	}

	function fetchTeamMemberBadgeData() {
		return client.query.teamMembers({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			user: { id: true, givenName: true, familyName: true, pronouns: true }
		});
	}

	interface BadgeUser {
		id: string;
		givenName: string | null;
		familyName: string | null;
		pronouns: string | null;
	}

	/** The fields every badge takes from the person wearing it. */
	function personOnBadge(user: BadgeUser) {
		return {
			name: formatNames(user.givenName ?? undefined, user.familyName ?? undefined, {
				familyNameUppercase: false
			}),
			pronouns: user.pronouns,
			id: user.id
		};
	}

	/** The person's media consent in this conference, as `badgeUser` selects it. */
	function mediaConsentOf(user: {
		conferenceParticipantStatus: { mediaConsentStatus: MediaconsentstatusEnum }[];
	}): MediaconsentstatusEnum {
		return user.conferenceParticipantStatus[0]?.mediaConsentStatus ?? 'NOT_SET';
	}

	/** Sorts by `label`, then by family name. */
	function compareByLabelThenFamilyName<T extends { user: BadgeUser }>(label: (item: T) => string) {
		return (a: T, b: T) => label(a).localeCompare(label(b)) || compareByFamilyName(a, b);
	}

	const exportBadgeCSV = (badgeData: Badge[], filename: string) => {
		downloadCSV(badgeHeader, badgeData.map(badgeRow), filename);
	};

	const getCommitteeBadgeData = async (committeeId: string) => {
		const resData = await fetchCommitteeBadgeData(committeeId);

		const badgeData = resData.delegationMembers.flatMap((member) => {
			const nation = member.delegation.assignedNation;
			return nation ? [{ user: member.user, nation }] : [];
		});
		const countryName = (member: (typeof badgeData)[number]) =>
			getFullTranslatedCountryNameFromISO3Code(member.nation.alpha3Code);

		exportBadgeCSV(
			badgeData.sort(compareByLabelThenFamilyName(countryName)).map((member) => ({
				...personOnBadge(member.user),
				committee: resData.abbreviation,
				countryName: countryName(member),
				countryAlpha2Code: member.nation.alpha2Code,
				alternativeImage: '',
				mediaConsentStatus: mediaConsentOf(member.user)
			})),
			`${resData.abbreviation}_badge_data_${new Date().toISOString()}.csv`
		);
	};

	const getNSAData = async () => {
		const resData = await fetchNsaBadgeData();

		const badgeData = resData.flatMap((member) => {
			const nsa = member.delegation.assignedNonStateActor;
			return nsa ? [{ user: member.user, label: nsa.name }] : [];
		});

		exportBadgeCSV(
			badgeData.sort(compareByLabelThenFamilyName((member) => member.label)).map((member) => ({
				...personOnBadge(member.user),
				countryName: member.label,
				countryAlpha2Code: 'un',
				alternativeImage: '',
				mediaConsentStatus: mediaConsentOf(member.user)
			})),
			`NSA_badge_data_${new Date().toISOString()}.csv`
		);
	};

	const getSingleParticipantsData = async () => {
		const resData = await fetchSingleParticipantBadgeData();

		const badgeData = resData.flatMap((member) =>
			member.assignedRole ? [{ user: member.user, label: member.assignedRole.name }] : []
		);

		exportBadgeCSV(
			badgeData.sort(compareByLabelThenFamilyName((member) => member.label)).map((member) => ({
				...personOnBadge(member.user),
				countryName: member.label,
				countryAlpha2Code: 'un',
				alternativeImage: '',
				mediaConsentStatus: mediaConsentOf(member.user)
			})),
			`single_participants_badge_data_${new Date().toISOString()}.csv`
		);
	};

	const getSupervisorData = async () => {
		const resData = await fetchSupervisorBadgeData();

		const badgeData = resData
			.filter(
				(supervisor) =>
					supervisor.supervisedDelegationMembers.some(
						(dm) =>
							dm.delegation.applied &&
							(dm.delegation.assignedNation || dm.delegation.assignedNonStateActor)
					) || supervisor.supervisedSingleParticipants.some((sp) => sp.applied && sp.assignedRole)
			)
			.sort(compareByFamilyName)
			.map((supervisor) => ({
				...personOnBadge(supervisor.user),
				countryName: m.supervisor(),
				countryAlpha2Code: '',
				alternativeImage: 'supervisor',
				mediaConsentStatus: mediaConsentOf(supervisor.user)
			}));

		exportBadgeCSV(badgeData, `supervisors_badge_data_${new Date().toISOString()}.csv`);
	};

	const getTeamMemberData = async () => {
		const resData = await fetchTeamMemberBadgeData();

		const badgeData = resData.sort(compareByFamilyName).map((member) => ({
			...personOnBadge(member.user),
			countryName: m.teamBadge(),
			countryAlpha2Code: 'un',
			alternativeImage: '',
			mediaConsentStatus: 'ALLOWED_ALL' as const
		}));

		exportBadgeCSV(badgeData, `team_members_badge_data_${new Date().toISOString()}.csv`);
	};
</script>

{#each committees as committee (committee.id)}
	<DownloadButton onclick={() => getCommitteeBadgeData(committee.id)} title={committee.name} />
{/each}
<DownloadButton onclick={getNSAData} title={m.nonStateActors()} />
<DownloadButton onclick={getSingleParticipantsData} title={m.singleParticipants()} />
<DownloadButton onclick={getSupervisorData} title={m.supervisors()} />
<DownloadButton onclick={getTeamMemberData} title={m.teamMembers()} />
