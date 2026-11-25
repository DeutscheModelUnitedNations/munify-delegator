import { describe, expect, test } from 'vitest';
import { detailsFingerprint, detailsSummary } from './postalDetails';

const ADA = {
	givenName: 'Ada',
	familyName: 'Lovelace',
	street: 'Street 1',
	apartment: null,
	zip: '53113',
	city: 'Bonn',
	country: 'DEU',
	birthday: new Date('2008-10-22')
};

describe('detailsFingerprint', () => {
	test('changes with every detail', () => {
		const changed = [
			{ ...ADA, givenName: 'Bea' },
			{ ...ADA, familyName: 'Byron' },
			{ ...ADA, street: 'Street 2' },
			{ ...ADA, apartment: 'b' },
			{ ...ADA, zip: '53114' },
			{ ...ADA, city: 'Kiel' },
			{ ...ADA, country: 'AUT' },
			{ ...ADA, birthday: new Date('2008-10-23') }
		].map(detailsFingerprint);
		expect(new Set([detailsFingerprint(ADA), ...changed]).size).toBe(changed.length + 1);
	});

	test('is eight hex digits, the same for the same details', () => {
		expect(detailsFingerprint(ADA)).toMatch(/^[0-9a-f]{8}$/);
		expect(detailsFingerprint({ ...ADA, birthday: new Date('2008-10-22') })).toBe(
			detailsFingerprint(ADA)
		);
	});

	test.each(['street', 'zip', 'city', 'country', 'birthday'])('is none without %s', (field) => {
		expect(detailsFingerprint({ ...ADA, [field]: null })).toBeUndefined();
	});
});

test('detailsSummary names the person and where they live', () => {
	expect(detailsSummary(ADA)).toBe('Ada Lovelace, Street 1, 53113 Bonn');
});
