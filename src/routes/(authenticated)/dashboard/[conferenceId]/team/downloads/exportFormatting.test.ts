import { describe, expect, test } from 'vitest';
import {
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

const statuses: NonNullable<Parameters<typeof registrationStatusColumns>[0]['status']> = {
	paymentStatus: 'DONE',
	termsAndConditions: 'PENDING',
	guardianConsent: 'PROBLEM',
	mediaConsent: 'DONE'
};

describe('registrationStatusColumns', () => {
	test('includes the guardian consent only for minors', () => {
		expect(registrationStatusColumns({ status: statuses, ofAge: false })).toEqual([
			'',
			'X',
			'P',
			'',
			'N'
		]);
		expect(registrationStatusColumns({ status: statuses, ofAge: true })).toEqual([
			'',
			'X',
			'',
			'',
			'Y'
		]);
	});

	test('treats a missing status row as pending', () => {
		expect(registrationStatusColumns({ status: undefined, ofAge: false })).toEqual([
			'X',
			'X',
			'X',
			'X',
			'N'
		]);
	});
});

describe('supervisorRow', () => {
	test('lists name, statuses and own attendance', () => {
		expect(
			supervisorRow({
				supervisor: { user: user('Ada', 'Lovelace'), plansOwnAttendenceAtConference: true },
				status: statuses
			})
		).toEqual(['Lovelace', 'Ada', '', 'X', '', 'Y']);
		expect(
			supervisorRow({
				supervisor: { user: user(null, null), plansOwnAttendenceAtConference: false },
				status: undefined
			})
		).toEqual(['', '', 'X', 'X', 'X', 'N']);
	});
});

describe('nonStateActorName', () => {
	test('is empty without a non-state actor', () => {
		expect(nonStateActorName({ assignedRole: { name: 'Greenpeace' } })).toBe('Greenpeace');
		expect(nonStateActorName({ assignedRole: null })).toBe('');
		expect(nonStateActorName({})).toBe('');
	});
});
