import { describe, expect, it } from 'vitest';
import {
	formalitiesOf,
	isOpen,
	needsGuardian,
	photoStatusShown,
	postalProgress,
	type FormalityStatuses
} from './formalities';

const done: FormalityStatuses = {
	paymentStatus: 'DONE',
	termsAndConditions: 'DONE',
	guardianConsent: 'DONE',
	mediaConsent: 'DONE',
	mediaConsentStatus: 'ALLOWED_ALL'
};

const openKeys = (status: FormalityStatuses | undefined, needsGuardian = true) =>
	formalitiesOf({ status, needsGuardian })
		.filter(isOpen)
		.map(({ key }) => key);

describe('formalitiesOf', () => {
	it('has nothing open once everything is settled', () => {
		expect(openKeys(done)).toEqual([]);
	});

	it('lists what is pending or a problem, in order', () => {
		expect(openKeys({ ...done, mediaConsent: 'PENDING', paymentStatus: 'PROBLEM' })).toEqual([
			'paymentStatus',
			'mediaConsent'
		]);
		expect(
			formalitiesOf({ status: { ...done, paymentStatus: 'PROBLEM' }, needsGuardian: true })[0]
		).toEqual({ key: 'paymentStatus', state: 'problem' });
	});

	it('asks for a guardian only where one is needed', () => {
		expect(openKeys({ ...done, guardianConsent: 'PENDING' }, true)).toEqual(['guardianConsent']);
		expect(openKeys({ ...done, guardianConsent: 'PENDING' }, false)).toEqual([]);
	});

	it('asks what photos are allowed only once the signed consent is there', () => {
		expect(openKeys({ ...done, mediaConsentStatus: 'NOT_SET' })).toEqual(['mediaConsentStatus']);
		expect(openKeys({ ...done, mediaConsent: 'PENDING', mediaConsentStatus: 'NOT_SET' })).toEqual([
			'mediaConsent'
		]);
	});

	it('counts everything as pending without a row', () => {
		expect(openKeys(undefined)).toEqual([
			'paymentStatus',
			'termsAndConditions',
			'guardianConsent',
			'mediaConsent'
		]);
	});
});

describe('needsGuardian', () => {
	const startConference = new Date('2027-03-04');
	const minor = { birthday: new Date('2010-01-01'), startConference };

	it('is for those under age at the conference who do not supervise', () => {
		expect(needsGuardian({ ...minor, isConferenceSupervisor: false })).toBe(true);
		expect(needsGuardian({ ...minor, isConferenceSupervisor: true })).toBe(false);
		expect(
			needsGuardian({
				birthday: new Date('2000-01-01'),
				startConference,
				isConferenceSupervisor: false
			})
		).toBe(false);
	});

	it('is assumed while the birthday is unknown', () => {
		expect(needsGuardian({ birthday: null, startConference, isConferenceSupervisor: false })).toBe(
			true
		);
	});
});

describe('postalProgress', () => {
	const progress = (status: FormalityStatuses) =>
		postalProgress(formalitiesOf({ status, needsGuardian: true }));

	it('counts the signed papers, the payment left out', () => {
		expect(progress({ ...done, paymentStatus: 'PENDING' })).toEqual({ done: 3, total: 3 });
		expect(progress({ ...done, guardianConsent: 'PROBLEM' })).toEqual({ done: 2, total: 3 });
	});

	it('counts the photo consent as open until it is known what it allows', () => {
		expect(progress({ ...done, mediaConsentStatus: 'NOT_SET' })).toEqual({ done: 2, total: 3 });
	});
});

describe('photoStatusShown', () => {
	it('waits for the consent unless it is set already', () => {
		expect(photoStatusShown({ mediaConsent: 'PENDING', mediaConsentStatus: 'NOT_SET' })).toBe(
			false
		);
		expect(photoStatusShown({ mediaConsent: 'PENDING', mediaConsentStatus: 'NOT_ALLOWED' })).toBe(
			true
		);
		expect(photoStatusShown({ mediaConsent: 'DONE', mediaConsentStatus: 'NOT_SET' })).toBe(true);
	});
});
