import { describe, expect, test } from 'vitest';
import {
	assertCommitteeDeletable,
	assertNonStateActorDeletable,
	assertSeatsPerDelegationAllowed,
	committeeUpdateData,
	lockedCommitteeSeats,
	nonStateActorUpdateData,
	seatRemovalBlockersWhere,
	totalSeats
} from '$api/services/seatPlanning';

const member = (
	assignedCommitteeId: string | null,
	given_name = 'Ada',
	family_name = 'Lovelace'
) => ({
	assignedCommitteeId,
	user: { given_name, family_name }
});

describe('seatRemovalBlockersWhere', () => {
	test('only matches members of the nation assigned to exactly that committee', () => {
		expect(seatRemovalBlockersWhere('gv', 'deu')).toEqual({
			assignedCommitteeId: 'gv',
			delegation: { assignedNationAlpha3Code: 'deu' }
		});
	});
});

describe('lockedCommitteeSeats', () => {
	test('groups the assigned members of a nation by committee', () => {
		const seats = lockedCommitteeSeats([
			{
				assignedNationAlpha3Code: 'deu',
				members: [
					member('gv', 'ada', 'lovelace'),
					member('sr', 'grace', 'hopper'),
					member('gv', 'alan', 'turing'),
					member(null)
				]
			}
		]);

		expect(seats).toEqual([
			{ committeeId: 'gv', nationAlpha3Code: 'deu', memberNames: ['Ada Lovelace', 'Alan Turing'] },
			{ committeeId: 'sr', nationAlpha3Code: 'deu', memberNames: ['Grace Hopper'] }
		]);
	});

	test('ignores delegations without a nation (NSAs) and members without a committee', () => {
		expect(
			lockedCommitteeSeats([
				{ assignedNationAlpha3Code: null, members: [member('gv')] },
				{ assignedNationAlpha3Code: 'fra', members: [member(null)] }
			])
		).toEqual([]);
	});
});

describe('assertSeatsPerDelegationAllowed', () => {
	test('accepts a value that is not part of the update', () => {
		expect(() => assertSeatsPerDelegationAllowed(null, [{ delegationId: 'a' }])).not.toThrow();
		expect(() => assertSeatsPerDelegationAllowed(undefined, [])).not.toThrow();
	});

	test('rejects fewer than one seat', () => {
		expect(() => assertSeatsPerDelegationAllowed(0, [])).toThrow();
	});

	test('rejects values below the biggest delegation assigned to the committee', () => {
		const assigned = [{ delegationId: 'a' }, { delegationId: 'a' }, { delegationId: 'b' }];
		expect(() => assertSeatsPerDelegationAllowed(1, assigned)).toThrow();
		expect(() => assertSeatsPerDelegationAllowed(2, assigned)).not.toThrow();
		expect(() => assertSeatsPerDelegationAllowed(3, assigned)).not.toThrow();
	});
});

describe('totalSeats', () => {
	test('weights nation entries by seats per delegation and adds the NSA seat amounts', () => {
		const committees = [
			{ numOfSeatsPerDelegation: 1, nations: ['deu', 'fra', 'usa'] },
			{ numOfSeatsPerDelegation: 2, nations: ['deu', 'chn'] },
			{ numOfSeatsPerDelegation: 3, nations: [] }
		];
		expect(totalSeats(committees, [{ seatAmount: 5 }, { seatAmount: 1 }])).toBe(3 + 4 + 6);
	});

	test('is zero for a conference without seats', () => {
		expect(totalSeats([], [])).toBe(0);
	});
});

describe('nonStateActorUpdateData', () => {
	test('leaves omitted and null fields untouched', () => {
		expect(nonStateActorUpdateData({ name: 'Greenpeace', abbreviation: null })).toEqual({
			name: 'Greenpeace',
			abbreviation: undefined,
			description: undefined,
			seatAmount: undefined,
			fontAwesomeIcon: undefined
		});
	});

	test('an empty icon clears it', () => {
		expect(nonStateActorUpdateData({ fontAwesomeIcon: '' }).fontAwesomeIcon).toBeNull();
		expect(nonStateActorUpdateData({ fontAwesomeIcon: 'fa-tree' }).fontAwesomeIcon).toBe('fa-tree');
	});

	test('rejects a seat amount below one', () => {
		expect(() => nonStateActorUpdateData({ seatAmount: 0 })).toThrow();
		expect(nonStateActorUpdateData({ seatAmount: 3 }).seatAmount).toBe(3);
	});
});

describe('committeeUpdateData', () => {
	test('keeps a null resolution headline so it can be cleared', () => {
		expect(committeeUpdateData({ resolutionHeadline: null, numOfSeatsPerDelegation: 2 })).toEqual({
			name: undefined,
			abbreviation: undefined,
			resolutionHeadline: null,
			numOfSeatsPerDelegation: 2
		});
	});
});

describe('assertCommitteeDeletable', () => {
	test('blocks while delegates are assigned or papers are attached', () => {
		expect(() => assertCommitteeDeletable(1, 0)).toThrow();
		expect(() => assertCommitteeDeletable(0, 2)).toThrow();
		expect(() => assertCommitteeDeletable(0, 0)).not.toThrow();
	});
});

describe('assertNonStateActorDeletable', () => {
	test('blocks while a delegation is assigned', () => {
		expect(() => assertNonStateActorDeletable(1)).toThrow();
		expect(() => assertNonStateActorDeletable(0)).not.toThrow();
	});
});
