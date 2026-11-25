import type { GuideReader } from './outline';

/** What decides how a participant reads the guide: their registration and the role it holds. */
export type ReaderPart = {
	conferenceSupervisor: { id: string } | null;
	delegationMember: {
		assignedCommitteeId: string | null;
		delegation: { assignedRole: { kind: 'NATION' | 'NON_STATE_ACTOR' | 'CUSTOM' } | null };
	} | null;
	singleParticipant: { assignedRoleId: string | null } | null;
};

/**
 * How a participant reads the guide: supervisors all of it, delegation members as delegates of
 * their committee (or as non-state actors), single participants by their custom role. Undefined
 * for somebody without a seat.
 */
export function readerOfPart(part: ReaderPart): GuideReader | undefined {
	if (part.conferenceSupervisor) return { kind: 'supervisor' };
	const role = part.delegationMember?.delegation.assignedRole;
	if (part.delegationMember && role) {
		return {
			kind: 'delegate',
			committeeId: part.delegationMember.assignedCommitteeId,
			nonStateActor: role.kind === 'NON_STATE_ACTOR'
		};
	}
	const roleId = part.singleParticipant?.assignedRoleId;
	return roleId ? { kind: 'singleParticipant', roleId } : undefined;
}
