<script lang="ts">
	import { client, type MediaconsentstatusEnum } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import formatNames from '#lib/helpers/formatNames.js';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import BadgeGeneratorLinks from '#lib/components/BadgeGeneratorLinks.svelte';
	import { compareByFamilyName } from './exportFormatting';
	import { personBadge, placardBadges } from '#lib/helpers/badgeCsv.js';

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
			conferenceParticipants: {
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
					assignedRole: { nation: { alpha2Code: true, alpha3Code: true } }
				}
			}
		});
	}

	function fetchNsaBadgeData() {
		return client.query.delegationMembers({
			__args: {
				where: {
					conference: { id: { eq: conferenceId } },
					delegation: { assignedRole: { kind: 'NON_STATE_ACTOR' } }
				}
			},
			id: true,
			user: badgeUser(),
			delegation: {
				id: true,
				assignedRole: { name: true }
			}
		});
	}

	function fetchSingleParticipantBadgeData() {
		return client.query.singleParticipants({
			__args: {
				where: {
					conference: { id: { eq: conferenceId } },
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
			__args: { where: { conference: { id: { eq: conferenceId } } } },
			id: true,
			user: badgeUser(),
			supervisedDelegationMembers: {
				delegation: {
					applied: true,
					assignedRoleId: true
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
	function personOnBadge(user: BadgeUser, mediaConsentStatus: MediaconsentstatusEnum) {
		return {
			name: formatNames(user.givenName ?? undefined, user.familyName ?? undefined, {
				familyNameUppercase: false
			}),
			pronouns: user.pronouns,
			id: user.id,
			mediaConsentStatus
		};
	}

	/** The person's media consent in this conference, as `badgeUser` selects it. */
	function mediaConsentOf(user: {
		conferenceParticipants: { mediaConsentStatus: MediaconsentstatusEnum }[];
	}): MediaconsentstatusEnum {
		return user.conferenceParticipants[0]?.mediaConsentStatus ?? 'NOT_SET';
	}

	/** Sorts by `label`, then by family name. */
	function compareByLabelThenFamilyName<T extends { user: BadgeUser }>(label: (item: T) => string) {
		return (a: T, b: T) => label(a).localeCompare(label(b)) || compareByFamilyName(a, b);
	}

	// the day of the export, in every file name
	const stamp = new Date().toISOString().slice(0, 10);

	const getCommitteeBadgeData = async (committeeId: string) => {
		const resData = await fetchCommitteeBadgeData(committeeId);

		const badgeData = resData.delegationMembers.flatMap((member) => {
			const nation = member.delegation.assignedRole?.nation;
			return nation ? [{ user: member.user, nation }] : [];
		});
		const countryName = (member: (typeof badgeData)[number]) =>
			getFullTranslatedCountryNameFromISO3Code(member.nation.alpha3Code);

		return badgeData.sort(compareByLabelThenFamilyName(countryName)).map((member) =>
			personBadge(personOnBadge(member.user, mediaConsentOf(member.user)), {
				kind: 'nation',
				alpha2Code: member.nation.alpha2Code,
				countryName: countryName(member),
				committee: resData.abbreviation
			})
		);
	};

	/** People holding a role that has no flag: shown by the role's name under the UN flag. */
	function labelBadges(
		rows: { user: BadgeUser & Parameters<typeof mediaConsentOf>[0]; label: string }[]
	) {
		return rows.sort(compareByLabelThenFamilyName((row) => row.label)).map((row) =>
			personBadge(personOnBadge(row.user, mediaConsentOf(row.user)), {
				kind: 'label',
				label: row.label
			})
		);
	}

	const getNSAData = async () =>
		labelBadges(
			(await fetchNsaBadgeData()).flatMap((member) => {
				const nsa = member.delegation.assignedRole;
				return nsa ? [{ user: member.user, label: nsa.name ?? '' }] : [];
			})
		);

	const getSingleParticipantsData = async () =>
		labelBadges(
			(await fetchSingleParticipantBadgeData()).flatMap((member) =>
				member.assignedRole ? [{ user: member.user, label: member.assignedRole.name ?? '' }] : []
			)
		);

	const getSupervisorData = async () =>
		(await fetchSupervisorBadgeData())
			.filter(
				(supervisor) =>
					supervisor.supervisedDelegationMembers.some(
						(dm) => dm.delegation.applied && dm.delegation.assignedRoleId
					) || supervisor.supervisedSingleParticipants.some((sp) => sp.applied && sp.assignedRole)
			)
			.sort(compareByFamilyName)
			.map((supervisor) =>
				personBadge(personOnBadge(supervisor.user, mediaConsentOf(supervisor.user)), {
					kind: 'image',
					label: m.supervisor(),
					image: 'supervisor'
				})
			);

	const getTeamMemberData = async () =>
		(await fetchTeamMemberBadgeData()).sort(compareByFamilyName).map((member) =>
			personBadge(personOnBadge(member.user, 'ALLOWED_ALL'), {
				kind: 'label',
				label: m.teamBadge()
			})
		);

	/** Table placards for every seat of every committee: the nations and the non-state actors. */
	const getPlacardData = async () => {
		const [committeeSeats, nonStateActors] = await Promise.all([
			client.query.committees({
				__args: { where: { conferenceId: { eq: conferenceId } } },
				abbreviation: true,
				roles: { nation: { alpha2Code: true, alpha3Code: true } },
				delegationMembers: {
					delegation: { assignedRole: { kind: true, name: true } }
				}
			}),
			client.query.conferenceRoles({
				__args: { where: { conferenceId: { eq: conferenceId }, kind: { eq: 'NON_STATE_ACTOR' } } },
				name: true
			})
		]);
		const committees = committeeSeats.map((committee) => ({
			abbreviation: committee.abbreviation,
			nations: committee.roles.flatMap((role) => (role.nation ? [role.nation] : [])),
			nonStateActors: committee.delegationMembers.flatMap(({ delegation }) =>
				delegation.assignedRole?.kind === 'NON_STATE_ACTOR' && delegation.assignedRole.name
					? [delegation.assignedRole.name]
					: []
			)
		}));
		const seated = new Set(committees.flatMap((committee) => committee.nonStateActors));
		return placardBadges(
			committees,
			nonStateActors.flatMap((role) => (role.name && !seated.has(role.name) ? [role.name] : [])),
			getFullTranslatedCountryNameFromISO3Code
		);
	};
</script>

<p class="text-base-content/60 col-span-full text-sm">
	<i class="fa-sharp-duotone fa-solid fa-circle-info"></i>
	{m.badgeGeneratorHint()}
</p>
{#each committees as committee (committee.id)}
	<BadgeGeneratorLinks
		variant="tile"
		badges={() => getCommitteeBadgeData(committee.id)}
		filename="{committee.name}_badges_{stamp}"
		label={committee.name}
	/>
{/each}
<BadgeGeneratorLinks
	variant="tile"
	badges={getNSAData}
	filename="NSA_badges_{stamp}"
	label={m.nonStateActors()}
/>
<BadgeGeneratorLinks
	variant="tile"
	badges={getSingleParticipantsData}
	filename="single_participants_badges_{stamp}"
	label={m.singleParticipants()}
/>
<BadgeGeneratorLinks
	variant="tile"
	badges={getSupervisorData}
	filename="supervisors_badges_{stamp}"
	label={m.supervisors()}
/>
<BadgeGeneratorLinks
	variant="tile"
	badges={getTeamMemberData}
	filename="team_members_badges_{stamp}"
	label={m.teamMembers()}
/>
<BadgeGeneratorLinks
	variant="tile"
	badges={getPlacardData}
	filename="placards_{stamp}"
	label={m.badgePlacards()}
/>
