import { describe, expect, it } from 'vitest';
import { buildUserFormValues, toUpdateUserArgs } from './userFormValues';

const stored = {
	givenName: 'Lena',
	familyName: 'Schmidt',
	birthday: new Date('2007-03-14T00:00:00.000Z'),
	phone: '+4915123456789',
	street: 'Hauptstraße 1',
	apartment: null,
	zip: '10115',
	city: 'Berlin',
	region: null,
	country: 'DEU',
	gender: 'FEMALE',
	pronouns: '',
	foodPreference: 'VEGAN',
	emergencyContacts: 'Mama: +49 170 1234567'
};

describe('buildUserFormValues', () => {
	it('shows the stored birthday as the same local day', () => {
		const { birthday } = buildUserFormValues(stored);
		expect([birthday.getFullYear(), birthday.getMonth(), birthday.getDate()]).toEqual([
			2007, 2, 14
		]);
	});

	it('falls back for missing values and unknown enum strings', () => {
		const values = buildUserFormValues({ gender: 'SOMETHING', foodPreference: null });
		expect(values).toMatchObject({
			given_name: '',
			region: '',
			gender: 'NO_STATEMENT',
			foodPreference: 'OMNIVORE'
		});
	});
});

describe('toUpdateUserArgs', () => {
	const form = (overrides: Partial<ReturnType<typeof buildUserFormValues>> = {}) => ({
		...buildUserFormValues(stored),
		...overrides
	});

	it('sends the address as an AddressInput with an alpha-2 country and the picked day', () => {
		const args = toUpdateUserArgs('user-1', form());
		expect(args).toMatchObject({
			id: 'user-1',
			givenName: 'Lena',
			familyName: 'Schmidt',
			pronouns: undefined,
			apartment: undefined,
			address: {
				streetAddress: 'Hauptstraße 1',
				postalCode: '10115',
				locality: 'Berlin',
				region: undefined,
				countryCode: 'DE'
			}
		});
		expect(args.birthday.toISOString()).toBe('2007-03-14T00:00:00.000Z');
		expect(args).not.toHaveProperty('given_name');
	});

	it('leaves out what the country does not use, even if it was typed before switching', () => {
		const german = toUpdateUserArgs('user-1', form({ region: 'CA' }));
		expect(german.address.region).toBeUndefined();

		const american = toUpdateUserArgs(
			'user-1',
			form({ country: 'USA', region: 'CA', zip: '94103' })
		);
		expect(american.address).toMatchObject({
			countryCode: 'US',
			region: 'CA',
			postalCode: '94103'
		});
	});
});
