import { describe, expect, it } from 'vitest';
import type { SeatSwitchMember } from '#lib/helpers/seatSwitch';
import {
	hasOneHeadPerDelegation,
	headDelegateChanges,
	isSameSeat,
	withChosenHeadDelegates
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

describe('withChosenHeadDelegates', () => {
	it('only overrides delegations that have a chosen member', () => {
		const after = withChosenHeadDelegates({
			members: [...france, ...kenya],
			headDelegateIds: ['fr-2']
		});

		expect(headOf(after, 'fr')).toEqual(['fr-2']);
		expect(headOf(after, 'ke')).toEqual(['ke-head']);
	});

	it('is rejected when two heads are chosen for one delegation', () => {
		const after = withChosenHeadDelegates({
			members: france,
			headDelegateIds: ['fr-head', 'fr-2']
		});

		expect(hasOneHeadPerDelegation(after)).toBe(false);
	});
});

describe('headDelegateChanges', () => {
	it('lists only the flags that change', () => {
		const changes = headDelegateChanges({
			before: [...france, ...kenya],
			change: { kind: 'swap', memberId: 'fr-head', otherMemberId: 'ke-2' },
			chosenHeadDelegateIds: ['fr-2', 'ke-head']
		});

		expect(changes).toEqual([
			{ id: 'fr-head', delegationId: 'ke', isHeadDelegate: false },
			{ id: 'fr-2', delegationId: 'fr', isHeadDelegate: true }
		]);
	});

	it('refuses a choice that leaves a delegation with two heads', () => {
		expect(
			headDelegateChanges({
				before: france,
				change: { kind: 'move', memberId: 'fr-2', targetDelegationId: 'fr' },
				chosenHeadDelegateIds: ['fr-head', 'fr-2']
			})
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
