import { describe, expect, test } from 'vitest';
import { confirmAllChange, scannedUserWithStatus } from './postalConfirm';

describe('scannedUserWithStatus', () => {
	test('needs both the user and the status row', () => {
		const user = { id: 'u' };
		const status = { id: 's' };
		expect(scannedUserWithStatus({ user, status })).toEqual({ user, status });
		expect(scannedUserWithStatus({ user, status: null })).toBeUndefined();
		expect(scannedUserWithStatus({ user: null, status })).toBeUndefined();
		expect(scannedUserWithStatus(undefined)).toBeUndefined();
	});
});

describe('confirmAllChange', () => {
	const start = new Date('2026-03-12T00:00:00Z');

	test('marks every document done and allows all media use', () => {
		expect(confirmAllChange(start, new Date('2010-01-01'))).toEqual({
			termsAndConditions: 'DONE',
			mediaConsent: 'DONE',
			guardianConsent: 'DONE',
			mediaConsentStatus: 'ALLOWED_ALL'
		});
	});

	test('leaves the guardian consent alone for adults', () => {
		expect(confirmAllChange(start, new Date('1990-01-01')).guardianConsent).toBeUndefined();
	});
});
