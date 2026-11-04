import { describe, expect, test } from 'vitest';
import { isProfileComplete, toTeamMemberRow } from './teamMemberRows';

const user = {
	id: 'u1',
	givenName: 'Ada',
	familyName: 'Lovelace',
	email: 'ada@example.org',
	birthday: new Date('2000-01-01'),
	phone: '0123',
	street: 'Street 1',
	zip: '12345',
	city: 'Kiel',
	country: 'DEU',
	gender: 'FEMALE',
	foodPreference: 'VEGAN'
};

describe('isProfileComplete', () => {
	test('needs every field the team is asked for', () => {
		expect(isProfileComplete(user)).toBe(true);
		expect(isProfileComplete({ ...user, street: '  ' })).toBe(false);
		expect(isProfileComplete({ ...user, birthday: null })).toBe(false);
		expect(isProfileComplete({ ...user, gender: undefined })).toBe(false);
	});
});

describe('toTeamMemberRow', () => {
	test('maps a member into a row', () => {
		expect(
			toTeamMemberRow({ id: 't1', role: 'MEMBER', createdAt: '2026-01-02T00:00:00Z', user })
		).toEqual({
			id: 't1',
			userId: 'u1',
			role: 'MEMBER',
			family_name: 'Lovelace',
			given_name: 'Ada',
			email: 'ada@example.org',
			phone: '0123',
			profileComplete: true,
			joinedAt: new Date('2026-01-02T00:00:00Z')
		});
	});
});
