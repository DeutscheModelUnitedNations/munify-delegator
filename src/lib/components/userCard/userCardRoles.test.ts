import { describe, expect, test, vi } from 'vitest';

vi.mock('#lib/api/rumbleClient/client.js', () => ({ client: {} }));

const { hasConferenceAccess, participationStage } = await import('./userCardRoles');

const role = { id: 'role' };
const supervisor = (delegationRoles: (object | null)[], singleRoles: (object | null)[]) => ({
	supervisedDelegationMembers: delegationRoles.map((assignedRole) => ({
		delegation: { assignedRole }
	})),
	supervisedSingleParticipants: singleRoles.map((assignedRole) => ({ assignedRole }))
});

describe('hasConferenceAccess', () => {
	test('lets the team in', () => {
		expect(hasConferenceAccess({ teamMember: { id: 'tm' } })).toBe(true);
	});

	test('lets in whoever holds a role, through the delegation or alone', () => {
		expect(hasConferenceAccess({ delegationMember: { delegation: { assignedRole: role } } })).toBe(
			true
		);
		expect(hasConferenceAccess({ singleParticipant: { assignedRole: role } })).toBe(true);
	});

	test('keeps applicants without a role out', () => {
		expect(
			hasConferenceAccess({
				delegationMember: { delegation: { assignedRole: null } },
				singleParticipant: { assignedRole: null }
			})
		).toBe(false);
		expect(hasConferenceAccess({})).toBe(false);
	});

	test('lets a supervisor in once anyone they supervise holds a role', () => {
		expect(hasConferenceAccess({ conferenceSupervisor: supervisor([null, role], []) })).toBe(true);
		expect(hasConferenceAccess({ conferenceSupervisor: supervisor([], [role]) })).toBe(true);
		expect(hasConferenceAccess({ conferenceSupervisor: supervisor([null], [null]) })).toBe(false);
	});
});

describe('participationStage', () => {
	const state = 'PARTICIPANT_REGISTRATION';

	test('follows an application from registering to attending', () => {
		expect(participationStage({ application: { applied: false }, conferenceState: state })).toBe(
			'registered'
		);
		expect(participationStage({ application: { applied: true }, conferenceState: state })).toBe(
			'applied'
		);
		expect(
			participationStage({
				application: { applied: true, assignedRole: role },
				conferenceState: state
			})
		).toBe('seated');
		expect(
			participationStage({
				application: { applied: true, assignedRole: role },
				didAttend: true,
				conferenceState: 'ACTIVE'
			})
		).toBe('attended');
	});

	test('calls an application without a role unseated once the assignment is done', () => {
		expect(
			participationStage({ application: { applied: true }, conferenceState: 'PREPARATION' })
		).toBe('notSeated');
	});

	test('shows somebody still waiting, but not once seated from the list', () => {
		expect(
			participationStage({ waitingListEntry: { assigned: false }, conferenceState: state })
		).toBe('waitingList');
		expect(
			participationStage({ waitingListEntry: { assigned: true }, conferenceState: state })
		).toBeUndefined();
	});

	test('has nothing to say about somebody without an application', () => {
		expect(participationStage({ conferenceState: state })).toBeUndefined();
	});
});
