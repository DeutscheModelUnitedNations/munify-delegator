import { describe, expect, test } from 'vitest';
import {
	assertCommitteeDeletable,
	assertSeatsPerDelegationAllowed,
	assertStoredTargetsUsable,
	committeeUpdateData,
	regionalBaselineArgsSchema,
	regionalBaselineTargetsUsable
} from './committeeRules';

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

describe('regionalBaselineTargetsUsable', () => {
	test('a manual baseline needs usable targets', () => {
		expect(regionalBaselineTargetsUsable({ baseline: 'MANUAL', targets: [3, 3, 2, 3, 4] })).toBe(
			true
		);
		expect(regionalBaselineTargetsUsable({ baseline: 'MANUAL', targets: [] })).toBe(false);
		expect(regionalBaselineTargetsUsable({ baseline: 'MANUAL', targets: [0, 0, 0, 0, 0] })).toBe(
			false
		);
	});

	test('templates keep stored targets but reject malformed ones', () => {
		expect(regionalBaselineTargetsUsable({ baseline: 'ECOSOC', targets: [] })).toBe(true);
		expect(regionalBaselineTargetsUsable({ baseline: 'ECOSOC', targets: [3, 3, 2, 3, 4] })).toBe(
			true
		);
		expect(regionalBaselineTargetsUsable({ baseline: 'ECOSOC', targets: [1, 2] })).toBe(false);
	});
});

describe('regionalBaselineArgsSchema', () => {
	test('checks given targets against the baseline', () => {
		expect(regionalBaselineArgsSchema.safeParse({ baseline: 'MANUAL', targets: [0] }).success).toBe(
			false
		);
		expect(
			regionalBaselineArgsSchema.safeParse({ baseline: 'MANUAL', targets: [3, 3, 2, 3, 4] }).success
		).toBe(true);
	});

	test('leaves left out targets to the stored ones', () => {
		expect(regionalBaselineArgsSchema.safeParse({ baseline: 'MANUAL' }).success).toBe(true);
		expect(() => assertStoredTargetsUsable({ baseline: 'MANUAL', targets: [] })).toThrow();
		expect(() => assertStoredTargetsUsable({ baseline: 'UN_MEMBERS', targets: [] })).not.toThrow();
	});
});
