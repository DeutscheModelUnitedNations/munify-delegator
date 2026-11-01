import { describe, expect, test } from 'vitest';
import { filteredStatValue, type RoleCounts } from './statsFilterValue';

const counts = { total: 10, applied: 6, notApplied: 4 };
const roles: RoleCounts = {
	delegationMembersWithRole: 3,
	delegationMembersWithoutRole: 1,
	singleParticipantsWithRole: 2,
	singleParticipantsWithoutRole: 5
};

describe('filteredStatValue', () => {
	test('has no value without a count object', () => {
		expect(
			filteredStatValue({ filter: 'all', object: undefined, roleBasedData: roles })
		).toBeUndefined();
		expect(
			filteredStatValue({ filter: 'appliedWithRole', object: undefined, roleBasedData: roles })
		).toBeUndefined();
	});

	test('status filters pick from the count object', () => {
		expect(filteredStatValue({ filter: 'all', object: counts })).toBe(10);
		expect(filteredStatValue({ filter: 'applied', object: counts })).toBe(6);
		expect(filteredStatValue({ filter: 'notApplied', object: counts })).toBe(4);
	});

	test('role filters have no value without role counts', () => {
		expect(filteredStatValue({ filter: 'appliedWithRole', object: counts })).toBeUndefined();
		expect(
			filteredStatValue({
				filter: 'appliedWithoutRole',
				object: counts,
				roleBasedData: undefined,
				entityType: 'delegationMembers'
			})
		).toBe(undefined);
	});

	test('role filters pick the entity type or sum both', () => {
		expect(
			filteredStatValue({
				filter: 'appliedWithRole',
				object: counts,
				roleBasedData: roles,
				entityType: 'delegationMembers'
			})
		).toBe(3);
		expect(
			filteredStatValue({
				filter: 'appliedWithRole',
				object: counts,
				roleBasedData: roles,
				entityType: 'singleParticipants'
			})
		).toBe(2);
		expect(
			filteredStatValue({
				filter: 'appliedWithRole',
				object: counts,
				roleBasedData: roles,
				entityType: 'total'
			})
		).toBe(5);
		expect(
			filteredStatValue({ filter: 'appliedWithRole', object: counts, roleBasedData: roles })
		).toBe(5);
		expect(
			filteredStatValue({
				filter: 'appliedWithoutRole',
				object: counts,
				roleBasedData: roles,
				entityType: 'delegationMembers'
			})
		).toBe(1);
		expect(
			filteredStatValue({
				filter: 'appliedWithoutRole',
				object: counts,
				roleBasedData: roles,
				entityType: 'singleParticipants'
			})
		).toBe(5);
		expect(
			filteredStatValue({ filter: 'appliedWithoutRole', object: counts, roleBasedData: roles })
		).toBe(6);
	});
});
