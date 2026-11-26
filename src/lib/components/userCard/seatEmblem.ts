import { splitRole, type ConferenceRoleKind } from '#lib/helpers/conferenceRole';

interface DelegationRole {
	kind: ConferenceRoleKind;
	name: string | null;
	icon: string | null;
	nation: { alpha2Code: string; alpha3Code: string } | null;
}

interface Parts {
	delegationMember?: {
		isHeadDelegate: boolean;
		assignedCommittee?: { abbreviation: string } | null;
		delegation: { assignedRole?: DelegationRole | null };
	};
	singleParticipant?: { assignedRole?: { name: string | null; icon: string | null } | null };
	conferenceSupervisor?: object;
	teamMember?: { role?: string | null };
}

interface Labels {
	countryName: (alpha3Code: string) => string;
	teamRole: (role: string) => string;
	delegationMember: string;
	singleParticipant: string;
	supervisor: string;
	teamMember: string;
}

/** What stands for a person's part in the conference beside their name. */
export interface SeatEmblem {
	/** The nation's flag, else `icon` */
	alpha2Code?: string;
	icon: string;
	/** What the flag or icon stands for, shown on hover */
	name?: string;
	/** Below the flag or icon */
	committee?: string;
	/** The part in words, where no flag says it */
	line?: string;
	headDelegate: boolean;
}

function delegationEmblem({
	member,
	labels
}: {
	member: NonNullable<Parts['delegationMember']>;
	labels: Labels;
}): SeatEmblem {
	const { nation, nonStateActor } = splitRole(member.delegation.assignedRole ?? null);
	const shared = {
		committee: member.assignedCommittee?.abbreviation,
		headDelegate: member.isHeadDelegate
	};
	if (nation) {
		const name = labels.countryName(nation.alpha3Code);
		return { ...shared, alpha2Code: nation.alpha2Code, icon: 'flag', name };
	}
	const name = nonStateActor?.name ?? labels.delegationMember;
	return { ...shared, icon: nonStateActor?.icon ?? 'users', name, line: name };
}

/** A part an icon stands for, which needs saying in words as well. */
function named({
	icon,
	fallback,
	name
}: {
	icon?: string | null;
	fallback: string;
	name: string;
}): SeatEmblem {
	return { icon: icon ?? fallback, name, line: name, headDelegate: false };
}

/** The emblem of a person's part; nothing for somebody who has none in the conference. */
export function seatEmblem({
	parts: { delegationMember, singleParticipant, conferenceSupervisor, teamMember },
	labels
}: {
	parts: Parts;
	labels: Labels;
}): SeatEmblem | undefined {
	if (delegationMember) return delegationEmblem({ member: delegationMember, labels });
	if (singleParticipant) {
		const role = singleParticipant.assignedRole;
		return named({
			icon: role?.icon,
			fallback: 'user',
			name: role?.name ?? labels.singleParticipant
		});
	}
	if (conferenceSupervisor)
		return named({ fallback: 'chalkboard-teacher', name: labels.supervisor });
	if (teamMember) {
		return named({
			fallback: 'users-three',
			name: [labels.teamMember, teamMember.role && labels.teamRole(teamMember.role)]
				.filter(Boolean)
				.join(' · ')
		});
	}
	return undefined;
}
