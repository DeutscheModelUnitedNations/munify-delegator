import { describe, expect, test } from 'vitest';
import { isMinor, mayRecordAnyway, scanIssues } from './scanCheck';

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
		expect(isMinor({ birthday: new Date('2008-10-10'), now })).toBe(true);
		expect(isMinor({ birthday: new Date('2008-10-09'), now })).toBe(false);
	});

	test('an unknown birthday counts as of age', () => {
		expect(isMinor({ birthday: null, now })).toBe(false);
		expect(isMinor({ birthday: undefined, now })).toBe(false);
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

	test('a team member is only shown, with nothing else to check', () => {
		const pending = { ...done, paymentStatus: 'PENDING' } as const;
		expect(
			scanIssues({ ...base, inConference: false, isTeamMember: true, status: pending })
		).toEqual(['teamMember']);
	});

	test('a team member who also takes part is checked like any participant', () => {
		expect(scanIssues({ ...base, isTeamMember: true })).toEqual([]);
	});

	test('a missing survey choice the session expects is an open point', () => {
		const missingSurveyOptions = ['Excursion A', 'Excursion B'];
		expect(scanIssues({ ...base, missingSurveyOptions })).toEqual(['surveyOptionMissing']);
		expect(scanIssues({ ...base, missingSurveyOptions: [] })).toEqual([]);
		// somebody outside the conference has answered nothing anyway
		expect(scanIssues({ ...base, inConference: false, missingSurveyOptions })).toEqual([
			'notInConference'
		]);
	});
});

describe('mayRecordAnyway', () => {
	test('open points about the person can be overridden', () => {
		expect(mayRecordAnyway(['paymentOpen', 'surveyOptionMissing'])).toBe(true);
	});

	test('a repeated scan, a stranger or the team never are', () => {
		expect(mayRecordAnyway(['paymentOpen', 'alreadyScanned'])).toBe(false);
		expect(mayRecordAnyway(['notInConference'])).toBe(false);
		expect(mayRecordAnyway(['teamMember'])).toBe(false);
	});
});
