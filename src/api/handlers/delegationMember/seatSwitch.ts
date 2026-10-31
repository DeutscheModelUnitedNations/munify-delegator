import { applySeatSwitch, type SeatSwitch, type SeatSwitchMember } from '#lib/helpers/seatSwitch';

/**
 * The server's side of a seat switch: the head delegates the caller chose are checked here, after
 * `applySeatSwitch` (shared with the switch dialog's preview) has preselected them.
 */

/** Overrides the head delegates of every delegation that has a chosen member in `headDelegateIds` */
export function withChosenHeadDelegates({
	members,
	headDelegateIds
}: {
	members: SeatSwitchMember[];
	headDelegateIds: readonly string[];
}): SeatSwitchMember[] {
	const chosen = new Set(headDelegateIds);
	const delegationsWithChoice = new Set(
		members.filter((x) => chosen.has(x.id)).map((x) => x.delegationId)
	);
	return members.map((x) =>
		delegationsWithChoice.has(x.delegationId) ? { ...x, isHeadDelegate: chosen.has(x.id) } : x
	);
}

export function hasOneHeadPerDelegation(members: SeatSwitchMember[]): boolean {
	const heads = new Map<string, number>();
	for (const x of members) {
		heads.set(x.delegationId, (heads.get(x.delegationId) ?? 0) + (x.isHeadDelegate ? 1 : 0));
	}
	return [...heads.values()].every((count) => count === 1);
}

export interface Seat {
	delegationId: string;
	assignedCommitteeId: string | null;
}

export function isSameSeat(a: Seat, b: Seat): boolean {
	return a.delegationId === b.delegationId && a.assignedCommitteeId === b.assignedCommitteeId;
}

/**
 * The head delegate flags that change with the switch, or undefined when the chosen head
 * delegates would leave a delegation with none or several
 */
export function headDelegateChanges({
	before,
	change,
	chosenHeadDelegateIds
}: {
	before: SeatSwitchMember[];
	change: SeatSwitch;
	chosenHeadDelegateIds?: readonly string[] | null;
}): SeatSwitchMember[] | undefined {
	const after = withChosenHeadDelegates({
		members: applySeatSwitch({ members: before, change }),
		headDelegateIds: chosenHeadDelegateIds ?? []
	});
	if (!hasOneHeadPerDelegation(after)) return undefined;
	return after.filter(
		(x) => x.isHeadDelegate !== before.find((y) => y.id === x.id)?.isHeadDelegate
	);
}
