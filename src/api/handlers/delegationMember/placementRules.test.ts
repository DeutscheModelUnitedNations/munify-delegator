import { describe, expect, test } from 'vitest';
import { placementProblem } from './placementRules';

const committee = { id: 'gv', numOfSeatsPerDelegation: 2 };

describe('placementProblem', () => {
	test('lets a person in while the role and the committee have room', () => {
		expect(
			placementProblem({ roleSeats: 3, members: [{ assignedCommitteeId: 'gv' }], committee })
		).toBeUndefined();
		expect(placementProblem({ roleSeats: 1, members: [] })).toBeUndefined();
	});

	test('refuses a role whose seats are all taken', () => {
		expect(
			placementProblem({
				roleSeats: 2,
				members: [{ assignedCommitteeId: null }, { assignedCommitteeId: null }]
			})
		).toBe('roleFull');
	});

	test('refuses a committee holding as many of the delegation as it seats', () => {
		expect(
			placementProblem({
				roleSeats: 5,
				members: [{ assignedCommitteeId: 'gv' }, { assignedCommitteeId: 'gv' }],
				committee
			})
		).toBe('committeeFull');
	});

	test('counts only the members in that committee', () => {
		expect(
			placementProblem({
				roleSeats: 5,
				members: [{ assignedCommitteeId: 'gv' }, { assignedCommitteeId: 'sr' }],
				committee
			})
		).toBeUndefined();
	});
});
