import { client, type MediaconsentstatusEnum } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import formatNames from '#lib/helpers/formatNames';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import { personBadge, placardBadges, type Badge, type BadgeSeat } from '#lib/helpers/badgeCsv';
import { sortedBadges, tableBadges, type SortableBadge } from './badgeOrder';

/** The rows of the badge generator's CSVs, read when one is downloaded. */

// Only this conference's status row, not every conference the person ever attended.
function badgeUser(conferenceId: string) {
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

interface BadgeUser {
	id: string;
	givenName: string | null;
	familyName: string | null;
	pronouns: string | null;
}

/** One person's nametag, with what it is sorted by. */
function sortableBadge({
	user,
	mediaConsentStatus,
	seat,
	label
}: {
	user: BadgeUser;
	mediaConsentStatus: MediaconsentstatusEnum;
	seat: BadgeSeat;
	label: string;
}): SortableBadge {
	const name = formatNames({
		givenName: user.givenName ?? undefined,
		familyName: user.familyName ?? undefined,
		options: { familyNameUppercase: false }
	});
	return {
		badge: personBadge({
			person: { name, pronouns: user.pronouns, id: user.id, mediaConsentStatus },
			seat
		}),
		label,
		familyName: user.familyName
	};
}

/** The person's media consent in this conference, as `badgeUser` selects it. */
function mediaConsentOf(user: {
	conferenceParticipants: { mediaConsentStatus: MediaconsentstatusEnum }[];
}): MediaconsentstatusEnum {
	return user.conferenceParticipants[0]?.mediaConsentStatus ?? 'NOT_SET';
}

/** Someone holding a role that has no flag: shown by the role's name under the UN flag. */
function labelBadge({
	user,
	label
}: {
	user: BadgeUser & Parameters<typeof mediaConsentOf>[0];
	label: string;
}) {
	return sortableBadge({
		user,
		mediaConsentStatus: mediaConsentOf(user),
		label,
		seat: { kind: 'label', label }
	});
}

export async function committeeBadges({
	conferenceId,
	committeeId
}: {
	conferenceId: string;
	committeeId: string;
}): Promise<Badge[]> {
	const committee = await client.query.committee({
		__args: { id: committeeId },
		abbreviation: true,
		delegationMembers: {
			user: badgeUser(conferenceId),
			delegation: { assignedRole: { nation: { alpha2Code: true, alpha3Code: true } } }
		}
	});
	return sortedBadges(
		committee.delegationMembers.flatMap(({ user, delegation }) => {
			const nation = delegation.assignedRole?.nation;
			if (!nation) return [];
			const countryName = getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code);
			return [
				sortableBadge({
					user,
					mediaConsentStatus: mediaConsentOf(user),
					label: countryName,
					seat: {
						kind: 'nation',
						alpha2Code: nation.alpha2Code,
						countryName,
						committee: committee.abbreviation
					}
				})
			];
		})
	);
}

/** Every delegate of a nation, in whatever committee (or none yet). */
async function nationBadgeRows(conferenceId: string) {
	const members = await client.query.delegationMembers({
		__args: {
			where: {
				conference: { id: { eq: conferenceId } },
				delegation: { assignedRole: { kind: 'NATION' } }
			}
		},
		user: badgeUser(conferenceId),
		assignedCommittee: { abbreviation: true },
		delegation: { assignedRole: { nation: { alpha2Code: true, alpha3Code: true } } }
	});
	return members.flatMap(({ user, assignedCommittee, delegation }) => {
		const nation = delegation.assignedRole?.nation;
		if (!nation) return [];
		const countryName = getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code);
		return [
			{
				...sortableBadge({
					user,
					mediaConsentStatus: mediaConsentOf(user),
					label: countryName,
					seat: {
						kind: 'nation',
						alpha2Code: nation.alpha2Code,
						countryName,
						committee: assignedCommittee?.abbreviation
					}
				}),
				alpha3Code: nation.alpha3Code
			}
		];
	});
}

async function nonStateActorBadgeRows(conferenceId: string) {
	const members = await client.query.delegationMembers({
		__args: {
			where: {
				conference: { id: { eq: conferenceId } },
				delegation: { assignedRole: { kind: 'NON_STATE_ACTOR' } }
			}
		},
		user: badgeUser(conferenceId),
		delegation: { assignedRole: { name: true } }
	});
	return members.flatMap(({ user, delegation }) =>
		delegation.assignedRole ? [labelBadge({ user, label: delegation.assignedRole.name ?? '' })] : []
	);
}

async function singleParticipantBadgeRows(conferenceId: string) {
	const singles = await client.query.singleParticipants({
		__args: {
			where: {
				conference: { id: { eq: conferenceId } },
				assignedRoleId: { isNotNull: true }
			}
		},
		user: badgeUser(conferenceId),
		assignedRole: { name: true }
	});
	return singles.flatMap(({ user, assignedRole }) =>
		assignedRole ? [labelBadge({ user, label: assignedRole.name ?? '' })] : []
	);
}

/** Supervisors with at least one student who got a seat; the others have nothing to attend. */
async function supervisorBadgeRows(conferenceId: string) {
	const supervisors = await client.query.conferenceSupervisors({
		__args: { where: { conference: { id: { eq: conferenceId } } } },
		user: badgeUser(conferenceId),
		supervisedDelegationMembers: { delegation: { applied: true, assignedRoleId: true } },
		supervisedSingleParticipants: { applied: true, assignedRole: { id: true } }
	});
	return supervisors
		.filter(
			(supervisor) =>
				supervisor.supervisedDelegationMembers.some(
					(member) => member.delegation.applied && member.delegation.assignedRoleId
				) ||
				supervisor.supervisedSingleParticipants.some(
					(single) => single.applied && single.assignedRole
				)
		)
		.map(({ user }) =>
			sortableBadge({
				user,
				mediaConsentStatus: mediaConsentOf(user),
				label: m.supervisor(),
				seat: { kind: 'image', label: m.supervisor(), image: 'supervisor' }
			})
		);
}

export const nonStateActorBadges = async (conferenceId: string) =>
	sortedBadges(await nonStateActorBadgeRows(conferenceId));

export const singleParticipantBadges = async (conferenceId: string) =>
	sortedBadges(await singleParticipantBadgeRows(conferenceId));

export const supervisorBadges = async (conferenceId: string) =>
	sortedBadges(await supervisorBadgeRows(conferenceId));

export async function teamMemberBadges(conferenceId: string) {
	const members = await client.query.teamMembers({
		__args: { where: { conferenceId: { eq: conferenceId } } },
		user: { id: true, givenName: true, familyName: true, pronouns: true }
	});
	return sortedBadges(
		members.map(({ user }) =>
			sortableBadge({
				user,
				mediaConsentStatus: 'ALLOWED_ALL',
				label: m.teamBadge(),
				seat: { kind: 'label', label: m.teamBadge() }
			})
		)
	);
}

/**
 * The nametags handed out at one check-in table (`team/check-in`), in the order of its sign: the
 * delegates of the nations it serves, then, at the table for everyone without a nation, the
 * non-state actors, individual roles and supervisors.
 */
export async function checkInTableBadges({
	conferenceId,
	binCount,
	index
}: {
	conferenceId: string;
	/** The count the bins were split into. */
	binCount: number;
	index: number;
}): Promise<Badge[]> {
	const groups = await client.query.nametagBinGroups({
		__args: { conferenceId, binCount, index },
		nationAlpha3Code: true,
		sortName: true
	});
	const nationNames = new Map(
		groups.flatMap((group) =>
			group.nationAlpha3Code
				? [[group.nationAlpha3Code.toUpperCase(), group.sortName] as const]
				: []
		)
	);
	const servesOthers = groups.some((group) => !group.nationAlpha3Code);

	const [nations, others] = await Promise.all([
		nationNames.size > 0 ? nationBadgeRows(conferenceId) : [],
		servesOthers
			? Promise.all([
					nonStateActorBadgeRows(conferenceId),
					singleParticipantBadgeRows(conferenceId),
					supervisorBadgeRows(conferenceId)
				]).then((lists) => lists.flat())
			: []
	]);
	return tableBadges({ nations, nationNames, others });
}

/** Table placards for every seat of every committee: the nations and the non-state actors. */
export async function placardData(conferenceId: string) {
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
			__args: { where: { conferenceId: { eq: conferenceId }, kind: 'NON_STATE_ACTOR' } },
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
	return placardBadges({
		committees,
		unseatedNonStateActors: nonStateActors.flatMap((role) =>
			role.name && !seated.has(role.name) ? [role.name] : []
		),
		countryName: getFullTranslatedCountryNameFromISO3Code
	});
}
