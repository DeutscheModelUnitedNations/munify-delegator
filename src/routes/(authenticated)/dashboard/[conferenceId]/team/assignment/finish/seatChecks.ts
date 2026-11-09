import { targetKey, type AssignmentGroup } from '#lib/assignment/state';

/**
 * What the summary checks before the draft is applied, beyond what blocks it (`planApply`): the
 * applications the team marked required that would still be without a seat, and whether any seat
 * would be left free. Both only warn. Pure.
 */

/** An application of the conference the team marked as required (`assignmentReview.required`). */
export type RequiredApplication =
	/** `size`: the delegation's members, the group size the board shows it under */
	{ delegationId: string; size?: number } | { singleParticipantId: string };

/** The application a review row is about; none for a row that names neither. */
export function requiredApplicationOf(review: {
	delegationId?: string | null;
	singleParticipantId?: string | null;
	delegation?: { memberCount: number } | null;
}): RequiredApplication[] {
	if (review.delegationId) {
		const size = review.delegation?.memberCount;
		return [{ delegationId: review.delegationId, ...(size === undefined ? {} : { size }) }];
	}
	if (review.singleParticipantId) return [{ singleParticipantId: review.singleParticipantId }];
	return [];
}

/** The people after applying, as the board sees them: groups with their role, singles with theirs. */
interface SeatedState {
	groups: readonly Pick<
		AssignmentGroup,
		'delegationId' | 'singleParticipantId' | 'target' | 'size'
	>[];
	singles: readonly { singleParticipantId: string; roleId: string | null }[];
}

/**
 * Which applications would not have a seat (the board holds every application that has one, or
 * that the draft touches, so one it does not hold has none). A delegation counts as seated only if
 * all of it is: a split part left without a role leaves its delegation short. A single participant
 * is seated by a custom role, or by the role of the delegation the draft turns them into.
 */
export function requiredWithoutSeat({
	required,
	state
}: {
	required: readonly RequiredApplication[];
	state: SeatedState;
}): RequiredApplication[] {
	const delegationSeated = new Map<string, boolean>();
	const seatedSingles = new Set(
		state.singles.filter((single) => single.roleId).map((single) => single.singleParticipantId)
	);
	for (const group of state.groups) {
		const seated = !!targetKey(group.target);
		if (group.delegationId) {
			delegationSeated.set(
				group.delegationId,
				(delegationSeated.get(group.delegationId) ?? true) && seated
			);
		}
		if (group.singleParticipantId && seated) seatedSingles.add(group.singleParticipantId);
	}
	return required.filter((application) =>
		'delegationId' in application
			? !delegationSeated.get(application.delegationId)
			: !seatedSingles.has(application.singleParticipantId)
	);
}

/**
 * How many seats every role together has, and how many stay free once the draft is applied:
 * nations and non-state actors (`seats`, by role key) for the groups, custom roles (`roleSeats`, by
 * role id) for the single participants.
 */
export function seatOccupancy({
	state,
	seats,
	roleSeats
}: {
	state: SeatedState;
	seats: ReadonlyMap<string, number>;
	roleSeats: ReadonlyMap<string, number>;
}) {
	const total = sum(seats.values()) + sum(roleSeats.values());
	const taken =
		sum(state.groups.filter((group) => targetKey(group.target)).map((group) => group.size)) +
		state.singles.filter((single) => single.roleId).length;
	return { total, taken, free: Math.max(0, total - taken) };
}

const sum = (values: Iterable<number>) => [...values].reduce((total, value) => total + value, 0);

/** An application whose review prioritizes one of its wishes (`assignmentReview.prioritizedRoleId`). */
export type PrioritizedApplication = (
	| { delegationId: string; singleParticipantId?: null }
	| { delegationId?: null; singleParticipantId: string }
) & { roleId: string };

/** The application a review row prioritizes a wish of; none for a row that prioritizes nothing. */
export function prioritizedApplicationOf(review: {
	delegationId?: string | null;
	singleParticipantId?: string | null;
	prioritizedRoleId?: string | null;
}): PrioritizedApplication[] {
	const roleId = review.prioritizedRoleId;
	if (!roleId) return [];
	if (review.delegationId) return [{ delegationId: review.delegationId, roleId }];
	if (review.singleParticipantId) {
		return [{ singleParticipantId: review.singleParticipantId, roleId }];
	}
	return [];
}

/**
 * The applications that would get a seat, but not on the role the team prioritized for them: the
 * roles they would hold instead. One left without a seat is not listed, the priority only says
 * which role, should it get one. A split delegation counts as getting its role when any part does.
 */
export function prioritizedElsewhere({
	prioritized,
	state
}: {
	prioritized: readonly PrioritizedApplication[];
	state: SeatedState;
}) {
	const held = new Map<string, string[]>();
	const hold = ({ id, roleId }: { id: string | null | undefined; roleId: string | null }) => {
		if (id && roleId) held.set(id, [...(held.get(id) ?? []), roleId]);
	};
	for (const group of state.groups) {
		hold({ id: group.delegationId, roleId: group.target.roleId });
		hold({ id: group.singleParticipantId, roleId: group.target.roleId });
	}
	for (const single of state.singles) {
		hold({ id: single.singleParticipantId, roleId: single.roleId });
	}
	return prioritized.flatMap((application) => {
		const roleIds = held.get(application.delegationId ?? application.singleParticipantId ?? '');
		if (!roleIds || roleIds.includes(application.roleId)) return [];
		return [{ application, heldRoleIds: [...new Set(roleIds)] }];
	});
}
