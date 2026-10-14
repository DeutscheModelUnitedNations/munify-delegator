import { m } from '$lib/paraglide/messages';
import { translateTeamRole } from '$lib/utils/enumTranslations';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';

/** What the registration desk is shown about who the caller is at this conference. */
export type ParticipantInfo = {
	type: 'delegation' | 'single' | 'team' | 'supervisor' | 'unassigned' | 'none';
	roleDisplay: string;
	committeeAbbreviation?: string;
	alpha2Code?: string;
	isNSA?: boolean;
	nsaIcon?: string | null;
};

/**
 * The parts of `MyConferenceParticipation` the description is built from. Structural, so the
 * caller hands over its live result as is.
 */
export interface ParticipationRoles {
	delegationMember: {
		assignedCommittee: { abbreviation: string } | null;
		delegation: {
			assignedNation: { alpha2Code: string; alpha3Code: string } | null;
			assignedNonStateActor: { name: string; fontAwesomeIcon: string | null } | null;
		};
	} | null;
	singleParticipant: {
		assignedRole: { name: string; fontAwesomeIcon: string | null } | null;
	} | null;
	teamMember: { role: string } | null;
	supervisor: object | null;
}

export function describeParticipant(participation: ParticipationRoles): ParticipantInfo {
	const delegationMember = participation?.delegationMember;
	const singleParticipant = participation?.singleParticipant;
	const teamMember = participation?.teamMember;
	const supervisor = participation?.supervisor;

	// Delegation Member with assigned nation
	if (delegationMember?.delegation?.assignedNation) {
		const nation = delegationMember.delegation.assignedNation;
		const committee = delegationMember.assignedCommittee;
		return {
			type: 'delegation',
			roleDisplay: getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code),
			committeeAbbreviation: committee?.abbreviation,
			alpha2Code: nation.alpha2Code.toLowerCase()
		};
	}

	// Delegation Member with assigned NSA
	if (delegationMember?.delegation?.assignedNonStateActor) {
		const nsa = delegationMember.delegation.assignedNonStateActor;
		return {
			type: 'delegation',
			roleDisplay: nsa.name,
			isNSA: true,
			nsaIcon: nsa.fontAwesomeIcon
		};
	}

	// Delegation Member without assignment
	if (delegationMember) {
		return { type: 'unassigned', roleDisplay: '' };
	}

	// Single Participant with assigned role
	if (singleParticipant?.assignedRole) {
		const role = singleParticipant.assignedRole;
		return {
			type: 'single',
			roleDisplay: role.name,
			isNSA: true,
			nsaIcon: role.fontAwesomeIcon
		};
	}

	// Single Participant without assignment
	if (singleParticipant) {
		return { type: 'unassigned', roleDisplay: '' };
	}

	// Team Member (always valid)
	if (teamMember) {
		return {
			type: 'team',
			roleDisplay: translateTeamRole(teamMember.role),
			isNSA: true,
			nsaIcon: 'users-gear'
		};
	}

	// Supervisor (always valid)
	if (supervisor) {
		return {
			type: 'supervisor',
			roleDisplay: m.supervisor(),
			isNSA: true,
			nsaIcon: 'chalkboard-user'
		};
	}

	return { type: 'none', roleDisplay: '' };
}
