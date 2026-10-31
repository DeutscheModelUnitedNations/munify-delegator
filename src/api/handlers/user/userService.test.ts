import { describe, expect, it, vi } from 'vitest';

vi.mock('#api/db/db', async () => ({ db: {}, schema: await import('#api/db/schema/index') }));
vi.mock('#api/pubsub', () => ({}));
vi.mock('#api/handlers/possibleDuplicate/possibleDuplicateService', () => ({
	scanUserForDuplicatesInBackground: () => {}
}));

const { profileArgsSchema } = await import('./userService');

describe('profileArgsSchema', () => {
	it('writes only the fields given, and null keeps what a profile always has', () => {
		const parsed = profileArgsSchema.parse({
			id: 'u',
			givenName: 'Anna',
			familyName: null,
			gender: null,
			apartment: null,
			pronouns: 'sie/ihr'
		});
		expect(parsed).toEqual({
			id: 'u',
			changes: {
				givenName: 'Anna',
				familyName: undefined,
				birthday: undefined,
				apartment: null,
				gender: undefined,
				pronouns: 'sie/ihr',
				foodPreference: undefined,
				emergencyContacts: undefined,
				wantsToReceiveGeneralInformation: undefined,
				wantsJoinTeamInformation: undefined,
				phone: undefined
			}
		});
	});

	it('turns an address into its columns, with the country as alpha-3', () => {
		const parsed = profileArgsSchema.parse({
			id: 'u',
			address: {
				countryCode: 'DE',
				streetAddress: 'Hauptstraße 1',
				postalCode: '10115',
				locality: 'Berlin'
			}
		});
		expect(parsed.changes).toMatchObject({
			street: 'Hauptstraße 1',
			zip: '10115',
			city: 'Berlin',
			region: null,
			country: 'DEU'
		});
	});

	it('refuses an unknown country and what the profile form refuses', () => {
		expect(
			profileArgsSchema.safeParse({
				id: 'u',
				address: { countryCode: 'XX', streetAddress: 'Somewhere 1' }
			}).success
		).toBe(false);
		expect(profileArgsSchema.safeParse({ id: 'u', emergencyContacts: '1' }).success).toBe(false);
		expect(profileArgsSchema.safeParse({ id: 'u', givenName: '' }).success).toBe(false);
	});
});
