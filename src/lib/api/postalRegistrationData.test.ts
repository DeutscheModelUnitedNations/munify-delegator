import { describe, expect, test } from 'vitest';
import {
	formatPostalParticipantName,
	postalParticipant,
	postalRecipient
} from './postalRegistrationData';

const conference = {
	postalName: 'DMUN e.V.',
	postalStreet: 'Musterstraße 1',
	postalApartment: 'c/o Geschäftsstelle',
	postalZip: '10115',
	postalCity: 'Berlin',
	postalCountry: 'Deutschland'
};

const birthday = new Date(2008, 4, 17);

const user = {
	id: 'u1',
	givenName: 'erika',
	familyName: 'mustermann',
	street: 'Hauptstraße 5',
	apartment: 'Hinterhaus',
	zip: '24103',
	city: 'Kiel',
	country: 'Deutschland',
	birthday
};

describe('formatPostalParticipantName', () => {
	test('prints the given name first, all uppercase', () => {
		expect(formatPostalParticipantName('Erika', 'Mustermann')).toBe('ERIKA MUSTERMANN');
		expect(formatPostalParticipantName(null, 'Mustermann')).toBe('MUSTERMANN');
		expect(formatPostalParticipantName('Erika', undefined)).toBe('ERIKA');
	});
});

describe('postalRecipient', () => {
	test('addresses the conference', () => {
		expect(postalRecipient(conference)).toEqual({
			name: 'DMUN e.V.',
			address: 'Musterstraße 1 c/o Geschäftsstelle',
			zip: '10115',
			city: 'Berlin',
			country: 'Deutschland'
		});
	});

	test('leaves missing parts blank', () => {
		expect(
			postalRecipient({
				postalName: 'DMUN e.V.',
				postalStreet: 'Musterstraße 1',
				postalApartment: null,
				postalZip: null,
				postalCity: undefined,
				postalCountry: null
			})
		).toEqual({
			name: 'DMUN e.V.',
			address: 'Musterstraße 1 ',
			zip: '',
			city: '',
			country: ''
		});
	});
});

describe('postalParticipant', () => {
	test('describes the participant and names the file after their initials', () => {
		expect(postalParticipant(user)).toEqual({
			birthday,
			participant: {
				id: 'u1',
				name: 'ERIKA MUSTERMANN',
				address: 'Hauptstraße 5 Hinterhaus, 24103 Kiel, Deutschland',
				birthday: birthday.toLocaleDateString()
			},
			fileName: 'EM_postal_registration.pdf'
		});
	});

	test('leaves out a missing apartment and falls back for missing names', () => {
		const result = postalParticipant({
			...user,
			apartment: null,
			givenName: null,
			familyName: null
		});
		expect(result?.participant.address).toBe('Hauptstraße 5 , 24103 Kiel, Deutschland');
		expect(result?.participant.name).toBe('');
		expect(result?.fileName).toBe('--_postal_registration.pdf');
	});

	test.each<keyof typeof user>(['street', 'zip', 'city', 'country', 'birthday'])(
		'is undefined without %s',
		(field) => {
			expect(postalParticipant({ ...user, [field]: null })).toBeUndefined();
		}
	);
});
