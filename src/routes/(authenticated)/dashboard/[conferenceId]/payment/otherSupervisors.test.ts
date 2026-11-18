import { describe, expect, test } from 'vitest';
import { findOtherSupervisors } from './otherSupervisors';

const me = {
	id: 'me-sup',
	plansOwnAttendenceAtConference: true,
	user: { id: 'me', givenName: 'Me', familyName: 'Self' }
};
const anna = {
	id: 'anna-sup',
	plansOwnAttendenceAtConference: true,
	user: { id: 'anna', givenName: 'Anna', familyName: 'A' }
};
const ben = {
	id: 'ben-sup',
	plansOwnAttendenceAtConference: true,
	user: { id: 'ben', givenName: 'Ben', familyName: 'B' }
};

describe('findOtherSupervisors', () => {
	test('is empty without a supervisor registration', () => {
		expect(findOtherSupervisors({ me: undefined, candidates: [anna] })).toEqual([]);
	});

	test('names the other supervisors of my students once, delegation members first', () => {
		expect(
			findOtherSupervisors({
				me: {
					user: me.user,
					supervisedDelegationMembers: [
						{ supervisors: [{ id: 'me-sup' }, { id: 'ben-sup' }] },
						{ supervisors: [{ id: 'ben-sup' }] }
					],
					supervisedSingleParticipants: [{ supervisors: [{ id: 'anna-sup' }, { id: 'me-sup' }] }]
				},
				candidates: [anna, ben, me]
			})
		).toEqual([ben.user, anna.user]);
	});

	test('leaves out supervisors whose user is not known', () => {
		expect(
			findOtherSupervisors({
				me: {
					user: me.user,
					supervisedDelegationMembers: [{ supervisors: [{ id: 'stranger' }] }],
					supervisedSingleParticipants: []
				},
				candidates: [anna]
			})
		).toEqual([]);
	});

	test('leaves out supervisors who do not attend in person, who owe no fee', () => {
		expect(
			findOtherSupervisors({
				me: {
					user: me.user,
					supervisedDelegationMembers: [{ supervisors: [{ id: 'anna-sup' }, { id: 'ben-sup' }] }],
					supervisedSingleParticipants: []
				},
				candidates: [anna, { ...ben, plansOwnAttendenceAtConference: false }]
			})
		).toEqual([anna.user]);
	});
});
