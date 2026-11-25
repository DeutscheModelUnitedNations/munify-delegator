import { expect, test } from 'vitest';
import { readerOfPart, type ReaderPart } from './reader';

const nobody: ReaderPart = {
	conferenceSupervisor: null,
	delegationMember: null,
	singleParticipant: null
};

test('supervisors read everything', () => {
	expect(readerOfPart({ ...nobody, conferenceSupervisor: { id: 's' } })).toEqual({
		kind: 'supervisor'
	});
});

test('delegation members read as delegates of their committee, or as NSAs', () => {
	const member = (kind: 'NATION' | 'NON_STATE_ACTOR') => ({
		...nobody,
		delegationMember: { assignedCommitteeId: 'ga', delegation: { assignedRole: { kind } } }
	});
	expect(readerOfPart(member('NATION'))).toEqual({
		kind: 'delegate',
		committeeId: 'ga',
		nonStateActor: false
	});
	expect(readerOfPart(member('NON_STATE_ACTOR'))).toMatchObject({ nonStateActor: true });
});

test('single participants read by their role; nobody without a seat', () => {
	expect(readerOfPart({ ...nobody, singleParticipant: { assignedRoleId: 'press' } })).toEqual({
		kind: 'singleParticipant',
		roleId: 'press'
	});
	expect(readerOfPart({ ...nobody, singleParticipant: { assignedRoleId: null } })).toBeUndefined();
	expect(
		readerOfPart({
			...nobody,
			delegationMember: { assignedCommitteeId: null, delegation: { assignedRole: null } }
		})
	).toBeUndefined();
});
