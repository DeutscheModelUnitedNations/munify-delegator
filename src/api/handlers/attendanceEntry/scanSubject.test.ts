import { describe, expect, it } from 'vitest';
import { scanSubjectProblem } from './scanSubject';

const none = {
	delegationMemberships: [],
	singleParticipant: [],
	conferenceSupervisor: [],
	teamMember: []
};
const one = [{ id: 'x' }];

describe('scanSubjectProblem', () => {
	it('records delegates, single participants and supervisors', () => {
		expect(scanSubjectProblem({ ...none, delegationMemberships: one })).toBeUndefined();
		expect(scanSubjectProblem({ ...none, singleParticipant: one })).toBeUndefined();
		expect(scanSubjectProblem({ ...none, conferenceSupervisor: one })).toBeUndefined();
	});

	it('refuses a team member, who has no participant row', () => {
		expect(scanSubjectProblem({ ...none, teamMember: one })).toBe('teamMember');
	});

	it('refuses someone without a part, or an unknown user', () => {
		expect(scanSubjectProblem(none)).toBe('notInConference');
		expect(scanSubjectProblem(undefined)).toBe('notInConference');
	});
});
