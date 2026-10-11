import { describe, expect, test } from 'vitest';
import {
	badgeHeader,
	badgeRow,
	compareByFamilyName,
	compareByName,
	formatRegistrationStatus,
	nonStateActorName,
	registrationStatusColumns,
	sortableName,
	supervisorRow
} from './exportFormatting';

const user = (givenName: string | null, familyName: string | null) => ({ givenName, familyName });

describe('name sorting', () => {
	test('sorts by family name first', () => {
		expect(sortableName(user('Ada', 'Lovelace'))).toBe('Lovelace Ada');
		const people = [{ user: user('B', 'Zeta') }, { user: user('A', 'Alpha') }];
		expect(people.toSorted(compareByName).map((p) => p.user.familyName)).toEqual(['Alpha', 'Zeta']);
		expect(
			[{ user: user('B', null) }, { user: user('A', 'Alpha') }]
				.toSorted(compareByFamilyName)
				.map((p) => p.user.givenName)
		).toEqual(['B', 'A']);
	});
});

describe('formatRegistrationStatus', () => {
	test('is empty when done, P on a problem and X otherwise', () => {
		expect(formatRegistrationStatus('DONE')).toBe('');
		expect(formatRegistrationStatus('PROBLEM')).toBe('P');
		expect(formatRegistrationStatus('PENDING')).toBe('X');
		expect(formatRegistrationStatus(undefined)).toBe('X');
	});
});

const statuses: NonNullable<Parameters<typeof registrationStatusColumns>[0]> = {
	paymentStatus: 'DONE',
	termsAndConditions: 'PENDING',
	guardianConsent: 'PROBLEM',
	mediaConsent: 'DONE'
};

describe('registrationStatusColumns', () => {
	test('includes the guardian consent only for minors', () => {
		expect(registrationStatusColumns(statuses, false)).toEqual(['', 'X', 'P', '', 'N']);
		expect(registrationStatusColumns(statuses, true)).toEqual(['', 'X', '', '', 'Y']);
	});

	test('treats a missing status row as pending', () => {
		expect(registrationStatusColumns(undefined, false)).toEqual(['X', 'X', 'X', 'X', 'N']);
	});
});

describe('supervisorRow', () => {
	test('lists name, statuses and own attendance', () => {
		expect(
			supervisorRow(
				{ user: user('Ada', 'Lovelace'), plansOwnAttendenceAtConference: true },
				statuses
			)
		).toEqual(['Lovelace', 'Ada', '', 'X', '', 'Y']);
		expect(
			supervisorRow({ user: user(null, null), plansOwnAttendenceAtConference: false }, undefined)
		).toEqual(['', '', 'X', 'X', 'X', 'N']);
	});
});

describe('nonStateActorName', () => {
	test('is empty without a non-state actor', () => {
		expect(nonStateActorName({ assignedNonStateActor: { name: 'Greenpeace' } })).toBe('Greenpeace');
		expect(nonStateActorName({ assignedNonStateActor: null })).toBe('');
		expect(nonStateActorName({})).toBe('');
	});
});

describe('badgeRow', () => {
	test('matches the header and fills missing values', () => {
		const full = badgeRow({
			name: 'Ada Lovelace',
			committee: 'GA',
			countryName: 'Germany',
			countryAlpha2Code: 'de',
			alternativeImage: 'img',
			pronouns: 'she/her',
			id: 'u',
			mediaConsentStatus: 'ALLOWED_ALL'
		});
		expect(full).toHaveLength(badgeHeader.length);
		expect(full).toEqual([
			'Ada Lovelace',
			'GA',
			'Germany',
			'de',
			'img',
			'she/her',
			'u',
			'ALLOWED_ALL'
		]);
		expect(badgeRow({ name: 'Ada', countryName: 'Team' })).toEqual([
			'Ada',
			'',
			'Team',
			'',
			'',
			'',
			'',
			'NOT_SET'
		]);
	});
});
