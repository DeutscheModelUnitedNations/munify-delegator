import { describe, expect, test } from 'vitest';
import { conferenceCapacity } from './capacity';

describe('conferenceCapacity', () => {
	test('counts every nation seat per committee, the non-state actors and the custom roles', () => {
		expect(
			conferenceCapacity({
				committees: [
					{ numOfSeatsPerDelegation: 2, roles: [{ id: 'deu' }, { id: 'fra' }] },
					{ numOfSeatsPerDelegation: 1, roles: [{ id: 'deu' }] }
				],
				nonStateActors: [{ id: 'icrc', seatAmount: 3 }, { id: 'ngo' }],
				customRoles: [{ seatAmount: 1 }, { seatAmount: null }]
			})
		).toBe(2 + 2 + 1 + 3 + 1);
	});

	test('is zero for a conference without roles', () => {
		expect(conferenceCapacity({ committees: [], nonStateActors: [], customRoles: [] })).toBe(0);
	});
});
