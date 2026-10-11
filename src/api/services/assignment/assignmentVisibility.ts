/**
 * Participants see the role they were assigned only once the team releases the assignment
 * (`conference.assignmentReleased`); the team always sees it. Before that, every participant-side
 * read rule comes in two variants: `maskedUntilRelease` lets the participant read the row without
 * its assignment, `onceReleased` adds the assignment back for released conferences. Rumble masks
 * per row, so a row shows a column if any rule it matches does.
 *
 * Nothing else is needed to keep the role from leaking: rumble follows the masks. A relation backed
 * by a masked key (`assignedNation { … }`) resolves to nothing, the relation pointing back
 * (`nation { assignedDelegations }`) lists only the rows exposing their key, and `where` / `orderBy`
 * arguments only match rows exposing the column they name.
 */

/** The columns that carry a delegation's assignment. */
export const DELEGATION_ASSIGNMENT = {
	assignedNationAlpha3Code: false,
	assignedNonStateActorId: false
} as const;

/** The column that carries the committee a delegate was seated in. */
export const DELEGATION_MEMBER_ASSIGNMENT = { assignedCommitteeId: false } as const;

/** The columns that carry a single participant's assignment. */
export const SINGLE_PARTICIPANT_ASSIGNMENT = {
	assignedRoleId: false,
	assignmentDetails: false
} as const;

/** A participant-side rule that reads the row but not its assignment. */
export function maskedUntilRelease<W extends object, C extends object>(
	filter: W | undefined,
	assignmentColumns: C
) {
	return filter ? { where: filter, columns: assignmentColumns } : undefined;
}

/** The same rule in full, for conferences whose assignment is released. */
export function onceReleased<W extends object>(filter: W | undefined) {
	return filter ? { where: { ...filter, conference: { assignmentReleased: true } } } : undefined;
}
