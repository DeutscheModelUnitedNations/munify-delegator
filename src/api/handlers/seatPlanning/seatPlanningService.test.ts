import { describe, expect, test } from 'vitest';
import {
	assertCommitteeDeletable,
	assertRegionalBaselineTargets,
	assertSeatsPerDelegationAllowed,
	committeeUpdateData,
	lockedCommitteeSeats,
	seatCountSchema,
	totalSeats
} from './seatPlanningService';

const member = (
	assignedCommitteeId: string | null,
	givenName = 'Ada',
	familyName = 'Lovelace'
) => ({
	assignedCommitteeId,
	user: { givenName, familyName }
});

describe('lockedCommitteeSeats', () => {
	test('groups the assigned members of a nation by committee', () => {
		const seats = lockedCommitteeSeats([
			{
				nationAlpha3Code: 'deu',
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
				{ nationAlpha3Code: null, members: [member('gv')] },
				{ nationAlpha3Code: 'fra', members: [member(null)] }
			])
		).toEqual([]);
	});
});

describe('seatCountSchema', () => {
	test('needs at least one seat', () => {
		expect(seatCountSchema.safeParse(0).success).toBe(false);
		expect(seatCountSchema.safeParse(1).success).toBe(true);
	});
});

describe('assertSeatsPerDelegationAllowed', () => {
	test('accepts a value that is not part of the update', () => {
		expect(() =>
			assertSeatsPerDelegationAllowed({
				numOfSeatsPerDelegation: null,
				assignedMembers: [{ delegationId: 'a' }]
			})
		).not.toThrow();
		expect(() =>
			assertSeatsPerDelegationAllowed({ numOfSeatsPerDelegation: undefined, assignedMembers: [] })
		).not.toThrow();
	});

	test('rejects values below the biggest delegation assigned to the committee', () => {
		const assigned = [{ delegationId: 'a' }, { delegationId: 'a' }, { delegationId: 'b' }];
		expect(() =>
			assertSeatsPerDelegationAllowed({ numOfSeatsPerDelegation: 1, assignedMembers: assigned })
		).toThrow();
		expect(() =>
			assertSeatsPerDelegationAllowed({ numOfSeatsPerDelegation: 2, assignedMembers: assigned })
		).not.toThrow();
		expect(() =>
			assertSeatsPerDelegationAllowed({ numOfSeatsPerDelegation: 3, assignedMembers: assigned })
		).not.toThrow();
	});
});

describe('totalSeats', () => {
	test('weights nation entries by seats per delegation and adds the NSA seat amounts', () => {
		const committees = [
			{
				numOfSeatsPerDelegation: 1,
				roles: [{ id: 'nation-deu' }, { id: 'nation-fra' }, { id: 'nation-usa' }]
			},
			{ numOfSeatsPerDelegation: 2, roles: [{ id: 'nation-deu' }, { id: 'nation-chn' }] },
			{ numOfSeatsPerDelegation: 3, roles: [] }
		];
		expect(totalSeats({ committees, nonStateActors: [{ seatAmount: 5 }, { seatAmount: 1 }] })).toBe(
			3 + 4 + 6
		);
	});

	test('is zero for a conference without seats', () => {
		expect(totalSeats({ committees: [], nonStateActors: [] })).toBe(0);
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
		expect(() => assertCommitteeDeletable({ assignedMembers: 1, papers: 0 })).toThrow();
		expect(() => assertCommitteeDeletable({ assignedMembers: 0, papers: 2 })).toThrow();
		expect(() => assertCommitteeDeletable({ assignedMembers: 0, papers: 0 })).not.toThrow();
	});
});

describe('assertRegionalBaselineTargets', () => {
	test('a manual baseline needs usable targets', () => {
		expect(() =>
			assertRegionalBaselineTargets({ baseline: 'MANUAL', targets: [3, 3, 2, 3, 4] })
		).not.toThrow();
		expect(() => assertRegionalBaselineTargets({ baseline: 'MANUAL', targets: [] })).toThrow();
		expect(() =>
			assertRegionalBaselineTargets({ baseline: 'MANUAL', targets: [0, 0, 0, 0, 0] })
		).toThrow();
	});

	test('templates keep stored targets but reject malformed ones', () => {
		expect(() => assertRegionalBaselineTargets({ baseline: 'ECOSOC', targets: [] })).not.toThrow();
		expect(() =>
			assertRegionalBaselineTargets({ baseline: 'ECOSOC', targets: [3, 3, 2, 3, 4] })
		).not.toThrow();
		expect(() => assertRegionalBaselineTargets({ baseline: 'ECOSOC', targets: [1, 2] })).toThrow();
	});
});
