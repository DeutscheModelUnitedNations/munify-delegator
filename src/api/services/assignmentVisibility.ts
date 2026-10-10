import type { Context } from '$api/context';
import type { ApiContext } from '$api/rumble';
import { isTeamMemberOf } from './authHelper';

/**
 * Participants see the role they were assigned only once the team releases the assignment
 * (`conference.assignmentReleased`); the team always sees it. Before that, every participant-side
 * read rule comes in two variants: `maskedUntilRelease` lets the participant read the row without
 * its assignment, `onceReleased` adds the assignment back for released conferences. Rumble masks
 * per row, so a row shows a column if any rule it matches does.
 *
 * Masking a foreign key is not enough on its own: the relation it backs (`assignedNation { … }`)
 * and the relation pointing back (`nation { assignedDelegations }`) are resolved through the
 * target table's rules. The handlers resolve the former through the masked key and filter the
 * latter with `assignmentVisible`.
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

/** Rows (with a `conference`) whose assignment the reader may see. */
export function assignmentVisible(ctx: Context) {
	const team = isTeamMemberOf(ctx);
	const released = { conference: { assignmentReleased: true } };
	if (!team) return released;
	// A system admin's team filter is the empty "everything".
	if (Object.keys(team).length === 0) return {};
	return { OR: [released, { conference: team }] };
}

/**
 * The query of a role's `assignedDelegations` relation: who holds a nation or non-state actor is
 * part of the assignment, which participants only see once it is released.
 */
export async function visibleAssignedDelegations(_args: unknown, ctx: ApiContext) {
	return (await ctx.abilities.delegation.filter('read')).merge({ where: assignmentVisible(ctx) })
		.query.many;
}
