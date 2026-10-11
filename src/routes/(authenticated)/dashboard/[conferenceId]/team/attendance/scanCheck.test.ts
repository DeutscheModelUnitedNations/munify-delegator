import { describe, expect, test } from 'vitest';
import { isMinor, scanIssues } from './scanCheck';

const now = new Date('2026-10-09T12:00:00Z');
const done = {
	paymentStatus: 'DONE',
	termsAndConditions: 'DONE',
	guardianConsent: 'DONE'
} as const;
const adult = new Date('2000-01-01');
const base = { inConference: true, status: done, birthday: adult, alreadyScanned: false, now };

describe('isMinor', () => {
	test('is true until the eighteenth birthday', () => {
		expect(isMinor(new Date('2008-10-10'), now)).toBe(true);
		expect(isMinor(new Date('2008-10-09'), now)).toBe(false);
	});

	test('an unknown birthday counts as of age', () => {
		expect(isMinor(null, now)).toBe(false);
		expect(isMinor(undefined, now)).toBe(false);
	});
});

describe('scanIssues', () => {
	test('is empty when everything is settled', () => {
		expect(scanIssues(base)).toEqual([]);
	});

	test('lists payment and terms that are not done, pending or problem alike', () => {
		const status = { ...done, paymentStatus: 'PENDING', termsAndConditions: 'PROBLEM' } as const;
		expect(scanIssues({ ...base, status })).toEqual(['paymentOpen', 'termsOpen']);
	});

	test('a person without a status row has everything pending', () => {
		expect(scanIssues({ ...base, status: null })).toEqual(['paymentOpen', 'termsOpen']);
	});

	test('guardian consent only matters for minors', () => {
		const status = { ...done, guardianConsent: 'PENDING' } as const;
		expect(scanIssues({ ...base, status })).toEqual([]);
		expect(scanIssues({ ...base, status, birthday: new Date('2010-05-05') })).toEqual([
			'guardianConsentOpen'
		]);
	});

	test('names people outside the conference first and repeat scans last', () => {
		expect(scanIssues({ ...base, inConference: false, alreadyScanned: true })).toEqual([
			'notInConference',
			'alreadyScanned'
		]);
	});
});
