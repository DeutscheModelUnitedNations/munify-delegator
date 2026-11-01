import { describe, expect, test } from 'vitest';
import { providerClaims } from './providerClaims';

describe('providerClaims', () => {
	test('passes standard claims through', () => {
		expect(
			providerClaims.parse({
				sub: 'u1',
				email: 'a@b.de',
				locale: 'de',
				preferred_username: 'ab',
				given_name: 'Anna',
				family_name: 'Berg',
				phone: '+49123'
			})
		).toEqual({
			sub: 'u1',
			email: 'a@b.de',
			locale: 'de',
			preferred_username: 'ab',
			given_name: 'Anna',
			family_name: 'Berg',
			phone: '+49123'
		});
	});

	test("reads Logto's username and splits its single name at the last word", () => {
		expect(
			providerClaims.parse({ sub: 'u1', username: 'ab', name: ' Anna Maria  Berg ' })
		).toMatchObject({
			preferred_username: 'ab',
			given_name: 'Anna Maria',
			family_name: 'Berg'
		});
	});

	test('prefers preferred_username over username, and split names over name', () => {
		expect(
			providerClaims.parse({
				sub: 'u1',
				preferred_username: 'pref',
				username: 'other',
				name: 'Someone Else',
				given_name: 'Anna',
				family_name: 'Berg'
			})
		).toMatchObject({ preferred_username: 'pref', given_name: 'Anna', family_name: 'Berg' });
	});

	test('uses a single-word name for both parts', () => {
		expect(providerClaims.parse({ sub: 'u1', name: 'Cher' })).toMatchObject({
			given_name: 'Cher',
			family_name: 'Cher'
		});
	});

	test('drops claims of another type', () => {
		const claims = providerClaims.parse({ sub: 'u1', email: null, locale: 3, phone: {} });
		expect(claims.email).toBeUndefined();
		expect(claims.locale).toBeUndefined();
		expect(claims.phone).toBeUndefined();
	});

	test('refuses claims without a subject', () => {
		expect(() => providerClaims.parse({ email: 'a@b.de' })).toThrow();
		expect(() => providerClaims.parse({ sub: '' })).toThrow();
	});
});
