import { describe, expect, it, vi } from 'vitest';

vi.mock('#api/db/db', async () => ({ db: {}, schema: await import('#api/db/schema/index') }));
vi.mock('#api/pubsub', () => ({}));
vi.mock('#api/handlers/possibleDuplicate/possibleDuplicateService', () => ({
	scanUserForDuplicatesInBackground: () => {}
}));

const { countConferenceParticipations, profileArgsSchema } = await import('./userService');
const { db } = await import('#api/db/db');

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

describe('countConferenceParticipations', () => {
	/** Answers the count queries with `results`, in the order they are asked. */
	function fakeCounts(results: { userId: string; value: number }[][]) {
		const answers = [...results];
		Object.assign(db, {
			select: () => {
				const chain = {
					from: () => chain,
					innerJoin: () => chain,
					where: () => chain,
					groupBy: async () => answers.shift()
				};
				return chain;
			}
		});
	}

	it('adds the seated delegation memberships and single participations per user', async () => {
		fakeCounts([
			[
				{ userId: 'u', value: 2 },
				{ userId: 'v', value: 1 }
			],
			[{ userId: 'u', value: 1 }]
		]);
		expect(await countConferenceParticipations(['u', 'v'])).toEqual(
			new Map([
				['u', 3],
				['v', 1]
			])
		);
	});

	it('counts a user without a seat as none', async () => {
		fakeCounts([[], [{ userId: 'u', value: 4 }]]);
		expect(await countConferenceParticipations(['u', 'w'])).toEqual(
			new Map([
				['u', 4],
				['w', 0]
			])
		);
	});

	it('asks nothing for no users', async () => {
		fakeCounts([]);
		expect(await countConferenceParticipations([])).toEqual(new Map());
	});
});
