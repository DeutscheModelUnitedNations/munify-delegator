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
		expect(filteredStatValue('all', undefined, roles)).toBeUndefined();
		expect(filteredStatValue('appliedWithRole', undefined, roles)).toBeUndefined();
	});

	test('status filters pick from the count object', () => {
		expect(filteredStatValue('all', counts)).toBe(10);
		expect(filteredStatValue('applied', counts)).toBe(6);
		expect(filteredStatValue('notApplied', counts)).toBe(4);
	});

	test('role filters have no value without role counts', () => {
		expect(filteredStatValue('appliedWithRole', counts)).toBeUndefined();
		expect(filteredStatValue('appliedWithoutRole', counts, undefined, 'delegationMembers')).toBe(
			undefined
		);
	});

	test('role filters pick the entity type or sum both', () => {
		expect(filteredStatValue('appliedWithRole', counts, roles, 'delegationMembers')).toBe(3);
		expect(filteredStatValue('appliedWithRole', counts, roles, 'singleParticipants')).toBe(2);
		expect(filteredStatValue('appliedWithRole', counts, roles, 'total')).toBe(5);
		expect(filteredStatValue('appliedWithRole', counts, roles)).toBe(5);
		expect(filteredStatValue('appliedWithoutRole', counts, roles, 'delegationMembers')).toBe(1);
		expect(filteredStatValue('appliedWithoutRole', counts, roles, 'singleParticipants')).toBe(5);
		expect(filteredStatValue('appliedWithoutRole', counts, roles)).toBe(6);
	});
});
