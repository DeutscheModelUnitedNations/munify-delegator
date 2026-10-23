import { describe, expect, it } from 'vitest';
import {
	applySeatSwitch,
	headDelegateChanges,
	isSameSeat,
	hasOneHeadPerDelegation,
	isHeadDelegateInvolved,
	nextSwitchSelection,
	seatSwitchError,
	seatSwitchVariables,
	toSeatSwitch,
	withChosenHeadDelegates,
	type SeatSwitchMember,
	type SwitchEmptySeat,
	type SwitchMember
} from '$lib/services/seatSwitch';

const france: SeatSwitchMember[] = [
	{ id: 'fr-head', delegationId: 'fr', isHeadDelegate: true },
	{ id: 'fr-2', delegationId: 'fr', isHeadDelegate: false }
];
const kenya: SeatSwitchMember[] = [
	{ id: 'ke-head', delegationId: 'ke', isHeadDelegate: true },
	{ id: 'ke-2', delegationId: 'ke', isHeadDelegate: false }
];

const headOf = (members: SeatSwitchMember[], delegationId: string) =>
	members.filter((x) => x.delegationId === delegationId && x.isHeadDelegate).map((x) => x.id);

describe('applySeatSwitch', () => {
	it('keeps the head delegate flag with the seat when swapping between delegations', () => {
		const after = applySeatSwitch([...france, ...kenya], {
			kind: 'swap',
			memberId: 'fr-head',
			otherMemberId: 'ke-2'
		});

		expect(after.find((x) => x.id === 'fr-head')?.delegationId).toBe('ke');
		expect(headOf(after, 'fr')).toEqual(['ke-2']);
		expect(headOf(after, 'ke')).toEqual(['ke-head']);
		expect(hasOneHeadPerDelegation(after)).toBe(true);
	});

	it('keeps the head delegate flag with the person when swapping within a delegation', () => {
		const after = applySeatSwitch(france, {
			kind: 'swap',
			memberId: 'fr-head',
			otherMemberId: 'fr-2'
		});

		expect(after).toEqual(france);
	});

	it('hands the head role to a remaining member when the head moves into a delegation with a head', () => {
		const after = applySeatSwitch([...france, ...kenya], {
			kind: 'move',
			memberId: 'fr-head',
			targetDelegationId: 'ke'
		});

		expect(headOf(after, 'fr')).toEqual(['fr-2']);
		expect(headOf(after, 'ke')).toEqual(['ke-head']);
	});

	it('makes the mover head of a delegation that has none yet', () => {
		const after = applySeatSwitch(france, {
			kind: 'move',
			memberId: 'fr-2',
			targetDelegationId: 'new'
		});

		expect(headOf(after, 'new')).toEqual(['fr-2']);
		expect(headOf(after, 'fr')).toEqual(['fr-head']);
	});
});

describe('withChosenHeadDelegates', () => {
	it('only overrides delegations that have a chosen member', () => {
		const after = withChosenHeadDelegates([...france, ...kenya], ['fr-2']);

		expect(headOf(after, 'fr')).toEqual(['fr-2']);
		expect(headOf(after, 'ke')).toEqual(['ke-head']);
	});

	it('is rejected when two heads are chosen for one delegation', () => {
		const after = withChosenHeadDelegates(france, ['fr-head', 'fr-2']);

		expect(hasOneHeadPerDelegation(after)).toBe(false);
	});
});

const pick = (id: string, delegationId: string): SwitchMember => ({
	kind: 'member',
	memberId: id,
	name: id,
	delegationId,
	seatLabel: delegationId
});
const freeSeat: SwitchEmptySeat = {
	kind: 'empty',
	nationAlpha3Code: 'ken',
	committeeId: 'gv',
	seatLabel: 'Kenya / GV'
};

describe('nextSwitchSelection', () => {
	it('selects a member first, ignoring free seats', () => {
		expect(nextSwitchSelection(undefined, freeSeat)).toEqual({ selected: undefined });
		expect(nextSwitchSelection(undefined, pick('fr-2', 'fr'))).toEqual({
			selected: pick('fr-2', 'fr')
		});
	});

	it('deselects on a second click on the same member and targets anything else', () => {
		const selected = pick('fr-2', 'fr');
		expect(nextSwitchSelection(selected, pick('fr-2', 'fr'))).toEqual({});
		expect(nextSwitchSelection(selected, freeSeat)).toEqual({ selected, target: freeSeat });
	});
});

describe('switch requests', () => {
	it('moves into a delegation that does not exist yet', () => {
		expect(toSeatSwitch(pick('fr-2', 'fr'), freeSeat)).toEqual({
			kind: 'move',
			memberId: 'fr-2',
			targetDelegationId: 'new'
		});
		expect(seatSwitchVariables(pick('fr-2', 'fr'), freeSeat)).toEqual({
			memberId: 'fr-2',
			targetNationAlpha3Code: 'ken',
			targetNonStateActorId: undefined,
			targetCommitteeId: 'gv'
		});
	});

	it('only asks about head delegates when one changes delegation', () => {
		const members = [...france, ...kenya];
		expect(isHeadDelegateInvolved(members, pick('fr-head', 'fr'), pick('ke-2', 'ke'))).toBe(true);
		expect(isHeadDelegateInvolved(members, pick('fr-2', 'fr'), pick('ke-2', 'ke'))).toBe(false);
		expect(isHeadDelegateInvolved(members, pick('fr-head', 'fr'), pick('fr-2', 'fr'))).toBe(false);
	});
});

describe('headDelegateChanges', () => {
	it('lists only the flags that change', () => {
		const changes = headDelegateChanges(
			[...france, ...kenya],
			{ kind: 'swap', memberId: 'fr-head', otherMemberId: 'ke-2' },
			['fr-2', 'ke-head']
		);

		expect(changes).toEqual([
			{ id: 'fr-head', delegationId: 'ke', isHeadDelegate: false },
			{ id: 'fr-2', delegationId: 'fr', isHeadDelegate: true }
		]);
	});

	it('refuses a choice that leaves a delegation with two heads', () => {
		expect(
			headDelegateChanges(france, { kind: 'move', memberId: 'fr-2', targetDelegationId: 'fr' }, [
				'fr-head',
				'fr-2'
			])
		).toBeUndefined();
	});
});

describe('isSameSeat', () => {
	it('compares delegation and committee', () => {
		const seat = { delegationId: 'fr', assignedCommitteeId: 'gv' };
		expect(isSameSeat(seat, { ...seat })).toBe(true);
		expect(isSameSeat(seat, { ...seat, assignedCommitteeId: null })).toBe(false);
	});
});

describe('seatSwitchError', () => {
	it('prefers the server reason and falls back when the request failed', () => {
		expect(seatSwitchError({ errors: [{ message: 'taken' }] }, 'fallback')).toBe('taken');
		expect(seatSwitchError({ errors: null }, 'fallback')).toBeUndefined();
		expect(seatSwitchError(undefined, 'fallback')).toBe('fallback');
	});
});
