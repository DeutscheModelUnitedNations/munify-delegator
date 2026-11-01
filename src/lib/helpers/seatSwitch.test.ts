import { describe, expect, it } from 'vitest';
import {
	applySeatSwitch,
	isHeadDelegateInvolved,
	nextSwitchSelection,
	seatSwitchVariables,
	toSeatSwitch,
	type SeatSwitchMember,
	type SwitchEmptySeat,
	type SwitchMember
} from './seatSwitch';

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
		const after = applySeatSwitch({
			members: [...france, ...kenya],
			change: {
				kind: 'swap',
				memberId: 'fr-head',
				otherMemberId: 'ke-2'
			}
		});

		expect(after.find((x) => x.id === 'fr-head')?.delegationId).toBe('ke');
		expect(headOf(after, 'fr')).toEqual(['ke-2']);
		expect(headOf(after, 'ke')).toEqual(['ke-head']);
	});

	it('keeps the head delegate flag with the person when swapping within a delegation', () => {
		const after = applySeatSwitch({
			members: france,
			change: {
				kind: 'swap',
				memberId: 'fr-head',
				otherMemberId: 'fr-2'
			}
		});

		expect(after).toEqual(france);
	});

	it('hands the head role to a remaining member when the head moves into a delegation with a head', () => {
		const after = applySeatSwitch({
			members: [...france, ...kenya],
			change: {
				kind: 'move',
				memberId: 'fr-head',
				targetDelegationId: 'ke'
			}
		});

		expect(headOf(after, 'fr')).toEqual(['fr-2']);
		expect(headOf(after, 'ke')).toEqual(['ke-head']);
	});

	it('makes the mover head of a delegation that has none yet', () => {
		const after = applySeatSwitch({
			members: france,
			change: {
				kind: 'move',
				memberId: 'fr-2',
				targetDelegationId: 'new'
			}
		});

		expect(headOf(after, 'new')).toEqual(['fr-2']);
		expect(headOf(after, 'fr')).toEqual(['fr-head']);
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
	roleId: 'ken',
	committeeId: 'gv',
	seatLabel: 'Kenya / GV'
};

describe('nextSwitchSelection', () => {
	it('selects a member first, ignoring free seats', () => {
		expect(nextSwitchSelection({ selected: undefined, seat: freeSeat })).toEqual({
			selected: undefined
		});
		expect(nextSwitchSelection({ selected: undefined, seat: pick('fr-2', 'fr') })).toEqual({
			selected: pick('fr-2', 'fr')
		});
	});

	it('deselects on a second click on the same member and targets anything else', () => {
		const selected = pick('fr-2', 'fr');
		expect(nextSwitchSelection({ selected, seat: pick('fr-2', 'fr') })).toEqual({});
		expect(nextSwitchSelection({ selected, seat: freeSeat })).toEqual({
			selected,
			target: freeSeat
		});
	});
});

describe('switch requests', () => {
	it('moves into a delegation that does not exist yet', () => {
		expect(toSeatSwitch({ selected: pick('fr-2', 'fr'), target: freeSeat })).toEqual({
			kind: 'move',
			memberId: 'fr-2',
			targetDelegationId: 'new'
		});
		expect(seatSwitchVariables({ selected: pick('fr-2', 'fr'), target: freeSeat })).toEqual({
			memberId: 'fr-2',
			targetRoleId: 'ken',
			targetCommitteeId: 'gv'
		});
	});

	it('only asks about head delegates when one changes delegation', () => {
		const members = [...france, ...kenya];
		expect(
			isHeadDelegateInvolved({
				members,
				selected: pick('fr-head', 'fr'),
				target: pick('ke-2', 'ke')
			})
		).toBe(true);
		expect(
			isHeadDelegateInvolved({ members, selected: pick('fr-2', 'fr'), target: pick('ke-2', 'ke') })
		).toBe(false);
		expect(
			isHeadDelegateInvolved({
				members,
				selected: pick('fr-head', 'fr'),
				target: pick('fr-2', 'fr')
			})
		).toBe(false);
	});
});
