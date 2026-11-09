import { describe, expect, test } from 'vitest';
import { displacedBy, partToClear, placementProblem } from './placementRules';

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

describe('partToClear', () => {
	test('refuses a team member or a supervisor', () => {
		expect(partToClear({ participant: undefined, isTeamMember: true })).toEqual({
			kind: 'refused'
		});
		expect(
			partToClear({ participant: { conferenceSupervisor: { id: 's' } }, isTeamMember: false })
		).toEqual({ kind: 'refused' });
	});

	test('clears a membership or a single registration', () => {
		expect(
			partToClear({ participant: { delegationMember: { id: 'm' } }, isTeamMember: false })
		).toEqual({ kind: 'member', id: 'm' });
		expect(
			partToClear({ participant: { singleParticipant: { id: 's' } }, isTeamMember: false })
		).toEqual({ kind: 'single', id: 's' });
	});

	test('clears nothing for someone without a part', () => {
		expect(partToClear({ participant: undefined, isTeamMember: false })).toEqual({ kind: 'none' });
		expect(partToClear({ participant: {}, isTeamMember: false })).toEqual({ kind: 'none' });
	});
});

describe('displacedBy', () => {
	const at = (day: number) => new Date(2026, 0, day);
	const member = { id: 'me', assignedCommitteeId: 'sr', updatedAt: at(5) };

	test('displaces nobody while the committee has room', () => {
		expect(
			displacedBy({
				member,
				members: [member, { id: 'a', assignedCommitteeId: 'gv', updatedAt: at(1) }],
				committee
			})
		).toBeUndefined();
	});

	test('displaces the occupant left untouched longest', () => {
		const older = { id: 'older', assignedCommitteeId: 'gv', updatedAt: at(1) };
		const newer = { id: 'newer', assignedCommitteeId: 'gv', updatedAt: at(3) };
		expect(displacedBy({ member, members: [member, newer, older], committee })).toBe(older);
	});

	test('does not count the member itself', () => {
		const seated = { id: 'me', assignedCommitteeId: 'gv', updatedAt: at(5) };
		const other = { id: 'a', assignedCommitteeId: 'gv', updatedAt: at(1) };
		expect(displacedBy({ member: seated, members: [seated, other], committee })).toBeUndefined();
	});
});
