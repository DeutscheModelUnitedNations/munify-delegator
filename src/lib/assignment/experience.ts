import type { AssignmentGroup } from './state';

/**
 * The share (0 to 1) of a group's people who were seated at an earlier conference.
 * `experiencedIds` holds the ids of the delegation members and single participants who were.
 */
export function experienceShare(group: AssignmentGroup, experiencedIds: ReadonlySet<string>) {
	if (group.singleParticipantId) return experiencedIds.has(group.singleParticipantId) ? 1 : 0;
	if (group.memberIds.length === 0) return 0;
	return group.memberIds.filter((id) => experiencedIds.has(id)).length / group.memberIds.length;
}
