import { describe, expect, test } from 'vitest';
import { findOtherSupervisors } from './otherSupervisors';

const me = { id: 'me-sup', user: { id: 'me', givenName: 'Me', familyName: 'Self' } };
const anna = { id: 'anna-sup', user: { id: 'anna', givenName: 'Anna', familyName: 'A' } };
const ben = { id: 'ben-sup', user: { id: 'ben', givenName: 'Ben', familyName: 'B' } };

describe('findOtherSupervisors', () => {
	test('is empty without a supervisor registration', () => {
		expect(findOtherSupervisors(undefined, [anna])).toEqual([]);
	});

	test('names the other supervisors of my students once, delegation members first', () => {
		expect(
			findOtherSupervisors(
				{
					user: me.user,
					supervisedDelegationMembers: [
						{ supervisors: [{ id: 'me-sup' }, { id: 'ben-sup' }] },
						{ supervisors: [{ id: 'ben-sup' }] }
					],
					supervisedSingleParticipants: [{ supervisors: [{ id: 'anna-sup' }, { id: 'me-sup' }] }]
				},
				[anna, ben, me]
			)
		).toEqual([ben.user, anna.user]);
	});

	test('leaves out supervisors whose user is not known', () => {
		expect(
			findOtherSupervisors(
				{
					user: me.user,
					supervisedDelegationMembers: [{ supervisors: [{ id: 'stranger' }] }],
					supervisedSingleParticipants: []
				},
				[anna]
			)
		).toEqual([]);
	});
});
