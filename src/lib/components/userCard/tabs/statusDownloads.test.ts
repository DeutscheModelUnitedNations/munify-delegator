import { describe, expect, test, vi } from 'vitest';

vi.mock('#lib/paraglide/runtime.js', () => ({ getLocale: () => 'de' }));
vi.mock('#lib/api/rumbleClient/client.js', () => ({ client: {} }));

const { careTeamPostalParticipant, certificateContentsOf, documentFileName, hasPostalAddress } =
	await import('./statusDownloads');

const conference = {
	postalName: 'DMUN e.V.',
	postalStreet: 'Musterstraße 1',
	postalZip: '10115',
	postalCity: 'Berlin',
	postalCountry: 'Deutschland'
};

const user = {
	id: 'u1',
	givenName: 'Erika',
	familyName: 'Mustermann',
	street: 'Hauptstraße 5',
	apartment: null,
	zip: '24103',
	city: 'Kiel',
	country: 'Deutschland',
	birthday: new Date(2008, 4, 17)
};

describe('hasPostalAddress', () => {
	test('needs every part of the address', () => {
		expect(hasPostalAddress(conference)).toBe(true);
		expect(hasPostalAddress({ ...conference, postalZip: null })).toBe(false);
		expect(hasPostalAddress({ ...conference, postalCountry: '' })).toBe(false);
	});
});

describe('careTeamPostalParticipant', () => {
	test('prints the address with the parts that are known', () => {
		expect(careTeamPostalParticipant(user)).toEqual({
			birthday: user.birthday,
			participant: {
				id: 'u1',
				name: 'ERIKA MUSTERMANN',
				address: 'Hauptstraße 5, 24103 Kiel, Deutschland',
				birthday: '17.5.2008'
			}
		});
		expect(
			careTeamPostalParticipant({ ...user, street: null, zip: null, apartment: 'Hinterhaus' })
				?.participant.address
		).toBe('Hinterhaus, Kiel, Deutschland');
	});

	test('cannot fill the documents in without a birthday', () => {
		expect(careTeamPostalParticipant({ ...user, birthday: null })).toBeUndefined();
	});
});

describe('documentFileName', () => {
	test('names the file after the person, family name first', () => {
		expect(documentFileName(user, 'certificate')).toBe('Mustermann_Erika_certificate.pdf');
		expect(documentFileName(user, 'postal_registration')).toBe(
			'Mustermann_Erika_postal_registration.pdf'
		);
	});
});

describe('certificateContentsOf', () => {
	test('copies what the certificate prints', () => {
		expect(
			certificateContentsOf({
				jwt: 'token',
				fullName: 'Erika Mustermann',
				sessions: [{ name: 'Day 1', attended: true }]
			})
		).toEqual({
			jwt: 'token',
			fullName: 'Erika Mustermann',
			sessions: [{ name: 'Day 1', attended: true }]
		});
	});

	test('is undefined while the API cannot sign one', () => {
		expect(certificateContentsOf(null)).toBeUndefined();
		expect(certificateContentsOf({ jwt: null, fullName: 'A', sessions: [] })).toBeUndefined();
		expect(certificateContentsOf({ jwt: 'token', fullName: '', sessions: [] })).toBeUndefined();
	});
});
