import { m } from '$lib/paraglide/messages';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import { translateTeamRole } from '$lib/utils/enumTranslations';

export type ApplicationStatus = 'accepted' | 'pending' | 'applied' | 'rejected';

interface AssignedNation {
	alpha2Code: string;
	alpha3Code: string;
}

interface AssignedNonStateActor {
	name: string;
	fontAwesomeIcon: string | null;
}

interface AssignedRole {
	name: string;
	fontAwesomeIcon: string | null;
}

interface AssignedCommittee {
	name: string;
	abbreviation: string;
}

/** What the card reads of `fetchMyParticipation`'s result. */
export interface ParticipationInput {
	teamMember: { role: string } | null;
	delegationMember: {
		isHeadDelegate: boolean;
		assignedCommittee: AssignedCommittee | null;
		delegation: {
			applied: boolean;
			assignedNation: AssignedNation | null;
			assignedNonStateActor: AssignedNonStateActor | null;
		};
	} | null;
	singleParticipant: { applied: boolean; assignedRole: AssignedRole | null } | null;
}

/** What the card reads of a supervisor's students. */
export interface SupervisedStudentsInput {
	supervisedDelegationMembers?: ReadonlyArray<{
		delegation: { assignedNation: object | null; assignedNonStateActor: object | null };
	}> | null;
	supervisedSingleParticipants?: ReadonlyArray<{ assignedRole: object | null }> | null;
}

/**
 * Where an application stands: accepted once assigned, pending until submitted, and after that
 * applied while registration is open and rejected once it has closed without an assignment.
 */
export function applicationStatus(
	assigned: boolean,
	applied: boolean,
	conferenceState: string
): ApplicationStatus {
	if (assigned) return 'accepted';
	if (!applied) return 'pending';
	return conferenceState === 'PARTICIPANT_REGISTRATION' ? 'applied' : 'rejected';
}

function delegationParticipation(
	delegationMember: NonNullable<ParticipationInput['delegationMember']>,
	conferenceState: string
) {
	const delegation = delegationMember.delegation;
	const hasAssignment = !!delegation.assignedNation || !!delegation.assignedNonStateActor;
	return {
		type: 'delegation' as const,
		status: applicationStatus(hasAssignment, delegation.applied, conferenceState),
		country: delegation.assignedNation,
		nonStateActor: delegation.assignedNonStateActor,
		committee: delegationMember.assignedCommittee,
		isHeadDelegate: delegationMember.isHeadDelegate
	};
}

/** A supervisor is accepted once any student is, pending during registration, rejected after. */
export function supervisorParticipation(
	supervisor: SupervisedStudentsInput,
	conferenceState: string
) {
	const delegationMembers = supervisor.supervisedDelegationMembers ?? [];
	const singleParticipants = supervisor.supervisedSingleParticipants ?? [];
	const acceptedStudentCount =
		delegationMembers.filter(
			(dm) => dm.delegation.assignedNation || dm.delegation.assignedNonStateActor
		).length + singleParticipants.filter((sp) => sp.assignedRole).length;

	let status: ApplicationStatus = 'rejected';
	if (acceptedStudentCount > 0) status = 'accepted';
	else if (conferenceState === 'PARTICIPANT_REGISTRATION') status = 'pending';

	return {
		type: 'supervisor' as const,
		status,
		studentCount: delegationMembers.length + singleParticipants.length,
		acceptedStudentCount
	};
}

/**
 * The role the caller holds in a conference, in order of precedence: team member, delegation
 * member, single participant, supervisor.
 */
export function participationOf(
	myParticipation: ParticipationInput | undefined,
	supervisedStudents: SupervisedStudentsInput | undefined,
	conferenceState: string
) {
	const { teamMember, delegationMember, singleParticipant } = myParticipation ?? {
		teamMember: null,
		delegationMember: null,
		singleParticipant: null
	};
	if (teamMember) {
		return {
			type: 'teamMember' as const,
			status: 'accepted' as const,
			teamRole: teamMember.role
		};
	}

	if (delegationMember) return delegationParticipation(delegationMember, conferenceState);

	if (singleParticipant) {
		return {
			type: 'singleParticipant' as const,
			status: applicationStatus(
				!!singleParticipant.assignedRole,
				singleParticipant.applied,
				conferenceState
			),
			customRole: singleParticipant.assignedRole
		};
	}

	if (supervisedStudents) return supervisorParticipation(supervisedStudents, conferenceState);

	return { type: 'unknown' as const, status: 'pending' as const };
}

export type CardParticipation = ReturnType<typeof participationOf>;

/** The icon shown in place of a flag, for every role without an assigned nation or NSA. */
export function roleIcon(participation: CardParticipation) {
	switch (participation.type) {
		case 'delegation':
			return 'fa-users';
		case 'singleParticipant':
			return `fa-${(participation.customRole?.fontAwesomeIcon ?? 'user').replace('fa-', '')}`;
		case 'supervisor':
			return 'fa-chalkboard-teacher';
		case 'teamMember':
			return 'fa-users-gear';
		default:
			return undefined;
	}
}

function delegationRoleText(participation: ReturnType<typeof delegationParticipation>) {
	if (participation.country) {
		return m.delegateFor({
			country: getFullTranslatedCountryNameFromISO3Code(participation.country.alpha3Code)
		});
	}
	if (participation.nonStateActor) {
		return m.delegateFor({ country: participation.nonStateActor.name });
	}
	return m.delegation();
}

/** The line describing the caller's role, e.g. "Delegate for France". */
export function roleText(participation: CardParticipation) {
	switch (participation.type) {
		case 'delegation':
			return delegationRoleText(participation);
		case 'singleParticipant':
			return participation.customRole?.name ?? m.singleParticipant();
		case 'supervisor':
			return m.supervisorWithStudents({ count: participation.studentCount });
		case 'teamMember':
			return m.teamMemberWithRole({ role: translateTeamRole(participation.teamRole) });
		default:
			return '';
	}
}
