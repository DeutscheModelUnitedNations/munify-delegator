<script lang="ts">
	import { client, type MediaconsentstatusEnum } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { downloadCSV } from '$lib/utils/downloadHelpers';
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

	const badgeUser = {
		id: true,
		givenName: true,
		familyName: true,
		pronouns: true,
		conferenceParticipantStatus: {
			id: true,
			mediaConsentStatus: true,
			conference: { id: true }
		}
	} as const;

	function fetchCommitteeBadgeData(committeeId: string) {
		return client.query.committee({
			__args: { id: committeeId },
			id: true,
			abbreviation: true,
			delegationMembers: {
				id: true,
				user: badgeUser,
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
			user: badgeUser,
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
			user: badgeUser,
			assignedRole: { name: true }
		});
	}

	function fetchSupervisorBadgeData() {
		return client.query.conferenceSupervisors({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			user: badgeUser,
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

	const exportBadgeCSV = (
		badgeData: {
			name: string;
			committee?: string | null;
			countryName: string;
			countryAlpha2Code?: string | null;
			alternativeImage?: string | null;
			pronouns?: string | null;
			id?: string | null;
			mediaConsentStatus?: MediaconsentstatusEnum;
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
			const resData = await fetchCommitteeBadgeData(committeeId);

			const badgeData = resData.delegationMembers
				.filter((member) => !!member.delegation.assignedNation)
				.sort((a, b) => {
					const countryCompare = getFullTranslatedCountryNameFromISO3Code(
						a.delegation.assignedNation!.alpha3Code
					).localeCompare(
						getFullTranslatedCountryNameFromISO3Code(b.delegation.assignedNation!.alpha3Code)
					);
					if (countryCompare !== 0) return countryCompare;
					return (a.user.familyName ?? '').localeCompare(b.user.familyName ?? '');
				})
				.map((member) => ({
					name: formatNames(
						member.user.givenName ?? undefined,
						member.user.familyName ?? undefined,
						{
							familyNameUppercase: false
						}
					),
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
			const resData = await fetchNsaBadgeData();

			const badgeData = resData
				.filter((member) => !!member.delegation.assignedNonStateActor)
				.sort((a, b) => {
					const countryCompare = a.delegation.assignedNonStateActor!.name.localeCompare(
						b.delegation.assignedNonStateActor!.name
					);
					if (countryCompare !== 0) return countryCompare;
					return (a.user.familyName ?? '').localeCompare(b.user.familyName ?? '');
				})
				.map((member) => ({
					name: formatNames(
						member.user.givenName ?? undefined,
						member.user.familyName ?? undefined,
						{
							familyNameUppercase: false
						}
					),
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
			const resData = await fetchSingleParticipantBadgeData();

			const badgeData = resData
				.filter((member) => !!member.assignedRole)
				.sort((a, b) => {
					const countryCompare = a.assignedRole!.name.localeCompare(b.assignedRole!.name);
					if (countryCompare !== 0) return countryCompare;
					return (a.user.familyName ?? '').localeCompare(b.user.familyName ?? '');
				})
				.map((member) => ({
					name: formatNames(
						member.user.givenName ?? undefined,
						member.user.familyName ?? undefined,
						{
							familyNameUppercase: false
						}
					),
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
				.sort((a, b) => (a.user.familyName ?? '').localeCompare(b.user.familyName ?? ''))
				.map((supervisor) => ({
					name: formatNames(
						supervisor.user.givenName ?? undefined,
						supervisor.user.familyName ?? undefined,
						{
							familyNameUppercase: false
						}
					),
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
			const resData = await fetchTeamMemberBadgeData();

			const badgeData = resData
				.sort((a, b) => (a.user.familyName ?? '').localeCompare(b.user.familyName ?? ''))
				.map((member) => ({
					name: formatNames(
						member.user.givenName ?? undefined,
						member.user.familyName ?? undefined,
						{
							familyNameUppercase: false
						}
					),
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
