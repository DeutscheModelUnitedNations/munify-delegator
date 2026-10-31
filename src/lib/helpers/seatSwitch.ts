export interface SeatSwitchMember {
	id: string;
	delegationId: string;
	isHeadDelegate: boolean;
}

export type SeatSwitch =
	| { kind: 'swap'; memberId: string; otherMemberId: string }
	| { kind: 'move'; memberId: string; targetDelegationId: string };

/**
 * Members of the affected delegations after the switch, with head delegate flags preselected:
 * between delegations the flag stays with the seat, within a delegation it stays with the person,
 * and every delegation that still has members ends up with exactly one head delegate.
 */
export function applySeatSwitch({
	members,
	change
}: {
	members: SeatSwitchMember[];
	change: SeatSwitch;
}): SeatSwitchMember[] {
	const mover = members.find((x) => x.id === change.memberId);
	if (!mover) return members;

	let after: SeatSwitchMember[];

	if (change.kind === 'swap') {
		const other = members.find((x) => x.id === change.otherMemberId);
		if (!other || other.delegationId === mover.delegationId) return members;
		after = members.map((x) => {
			if (x.id === mover.id)
				return { ...x, delegationId: other.delegationId, isHeadDelegate: other.isHeadDelegate };
			if (x.id === other.id)
				return { ...x, delegationId: mover.delegationId, isHeadDelegate: mover.isHeadDelegate };
			return x;
		});
	} else {
		if (change.targetDelegationId === mover.delegationId) return members;
		const targetHasHead = members.some(
			(x) => x.delegationId === change.targetDelegationId && x.isHeadDelegate
		);
		after = members.map((x) =>
			x.id === mover.id
				? {
						...x,
						delegationId: change.targetDelegationId,
						isHeadDelegate: x.isHeadDelegate && !targetHasHead
					}
				: x
		);
	}

	return ensureOneHeadPerDelegation(after);
}

function ensureOneHeadPerDelegation(members: SeatSwitchMember[]): SeatSwitchMember[] {
	const delegationsWithHead = new Set(
		members.filter((x) => x.isHeadDelegate).map((x) => x.delegationId)
	);
	return members.map((x) => {
		if (delegationsWithHead.has(x.delegationId)) return x;
		delegationsWithHead.add(x.delegationId);
		return { ...x, isHeadDelegate: true };
	});
}

/** A seated delegation member as picked in switch mode */
export interface SwitchMember {
	kind: 'member';
	memberId: string;
	name: string;
	delegationId: string;
	seatLabel: string;
}

/**
 * A free seat as picked in switch mode: a nation's seat in a committee, or a non-state actor's
 * (no committee). `delegationId` is missing while the role has no delegation yet.
 */
export interface SwitchEmptySeat {
	kind: 'empty';
	delegationId?: string;
	roleId: string;
	committeeId?: string;
	seatLabel: string;
}

export type SwitchSeat = SwitchMember | SwitchEmptySeat;

/** Stands in for the delegation a move into a role without one creates */
const NEW_DELEGATION_ID = 'new';

/** First click selects a member, a click on the same member deselects it, any other click picks the target */
export function nextSwitchSelection({
	selected,
	seat
}: {
	selected: SwitchMember | undefined;
	seat: SwitchSeat;
}): { selected?: SwitchMember; target?: SwitchSeat } {
	if (!selected) return { selected: seat.kind === 'member' ? seat : undefined };
	if (seat.kind === 'member' && seat.memberId === selected.memberId) return {};
	return { selected, target: seat };
}

function switchTargetDelegationId(target: SwitchSeat): string {
	return target.delegationId ?? NEW_DELEGATION_ID;
}

export function toSeatSwitch({
	selected,
	target
}: {
	selected: SwitchMember;
	target: SwitchSeat;
}): SeatSwitch {
	return target.kind === 'member'
		? { kind: 'swap', memberId: selected.memberId, otherMemberId: target.memberId }
		: {
				kind: 'move',
				memberId: selected.memberId,
				targetDelegationId: switchTargetDelegationId(target)
			};
}

/** Head delegates only need a decision when one of them changes delegation */
export function isHeadDelegateInvolved({
	members,
	selected,
	target
}: {
	members: SeatSwitchMember[];
	selected: SwitchMember;
	target: SwitchSeat;
}): boolean {
	if (selected.delegationId === switchTargetDelegationId(target)) return false;
	const moving = [selected.memberId, target.kind === 'member' ? target.memberId : undefined];
	return members.some((x) => x.isHeadDelegate && moving.includes(x.id));
}

/** Arguments of the `switchDelegationMemberSeats` mutation */
export function seatSwitchVariables({
	selected,
	target
}: {
	selected: SwitchMember;
	target: SwitchSeat;
}) {
	if (target.kind === 'member') {
		return { memberId: selected.memberId, otherMemberId: target.memberId };
	}
	return {
		memberId: selected.memberId,
		targetRoleId: target.roleId,
		targetCommitteeId: target.committeeId
	};
}
