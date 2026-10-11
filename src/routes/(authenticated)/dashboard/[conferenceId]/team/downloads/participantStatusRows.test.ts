import { describe, expect, test } from 'vitest';
import {
	calculateCombinedStatus,
	defaultStatus,
	exportRow,
	formatSupervisorNames,
	summarizePostalStatus,
	type StatusData
} from './participantStatusRows';

const done: StatusData = {
	termsAndConditions: 'DONE',
	guardianConsent: 'DONE',
	mediaConsent: 'DONE',
	mediaConsentStatus: 'ALLOWED_ALL',
	paymentStatus: 'DONE',
	didAttend: true
};

describe('formatSupervisorNames', () => {
	test('joins the names and skips nameless supervisors', () => {
		expect(
			formatSupervisorNames([
				{ user: { givenName: 'Ada', familyName: 'Lovelace' } },
				{ user: { givenName: null, familyName: null } },
				{ user: { givenName: null, familyName: 'Turing' } }
			])
		).toBe('Ada Lovelace, Turing');
		expect(formatSupervisorNames([])).toBe('');
	});
});

describe('summarizePostalStatus', () => {
	test('a problem wins over pending, pending over done', () => {
		expect(summarizePostalStatus(done)).toBe('DONE');
		expect(summarizePostalStatus({ ...done, mediaConsent: 'PENDING' })).toBe('PENDING');
		expect(
			summarizePostalStatus({ ...done, mediaConsent: 'PENDING', guardianConsent: 'PROBLEM' })
		).toBe('PROBLEM');
	});
});

describe('calculateCombinedStatus', () => {
	test('names what is still open', () => {
		expect(calculateCombinedStatus(done)).toBe('Both not pending');
		expect(calculateCombinedStatus({ ...done, paymentStatus: 'PENDING' })).toBe(
			'Only Payment pending'
		);
		expect(calculateCombinedStatus({ ...done, termsAndConditions: 'PROBLEM' })).toBe(
			'Only Postal pending'
		);
		expect(calculateCombinedStatus(defaultStatus)).toBe('Postal and Payment pending');
	});
});

describe('exportRow', () => {
	test('lists identity, role and every status column', () => {
		expect(
			exportRow(
				{ id: 'u', email: 'a@example.org', givenName: 'Ada', familyName: 'Lovelace' },
				{ roleType: 'Delegation', roleName: 'Germany', committee: 'GA', supervisors: 'T' },
				done
			)
		).toEqual([
			'u',
			'a@example.org',
			'Ada',
			'Lovelace',
			'Delegation',
			'Germany',
			'GA',
			'T',
			'DONE',
			'DONE',
			'DONE',
			'DONE',
			'ALLOWED_ALL',
			'DONE',
			'true',
			'Both not pending'
		]);
	});

	test('leaves missing values empty', () => {
		const row = exportRow(
			{ id: 'u', email: null, givenName: null, familyName: null },
			{ roleType: 'Supervisor', roleName: 'Supervisor' },
			defaultStatus
		);
		expect(row.slice(0, 8)).toEqual(['u', '', '', '', 'Supervisor', 'Supervisor', '', '']);
		expect(row.at(-2)).toBe('false');
	});
});
