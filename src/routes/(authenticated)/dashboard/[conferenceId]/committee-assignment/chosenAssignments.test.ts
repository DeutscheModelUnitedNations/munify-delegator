import { describe, expect, test } from 'vitest';
import { chosenAssignments } from './chosenAssignments';

describe('chosenAssignments', () => {
	test('sends the committee picked for every member', () => {
		expect(
			chosenAssignments([
				{ delegationMemberId: 'm1', committeeId: 'ga' },
				{ delegationMemberId: 'm2', committeeId: 'sc' }
			])
		).toEqual([
			{ delegationMemberId: 'm1', committeeId: 'ga' },
			{ delegationMemberId: 'm2', committeeId: 'sc' }
		]);
	});

	test('sends nothing while a member has no committee picked', () => {
		expect(
			chosenAssignments([
				{ delegationMemberId: 'm1', committeeId: 'ga' },
				{ delegationMemberId: 'm2', committeeId: null }
			])
		).toBeUndefined();
		expect(chosenAssignments([{ delegationMemberId: 'm1', committeeId: '' }])).toBeUndefined();
	});
});
