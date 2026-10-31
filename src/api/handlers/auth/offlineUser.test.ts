import { describe, expect, test } from 'vitest';
import { offlineUserOf } from './offlineUser';

describe('offlineUserOf', () => {
	test('fills the missing parts of the parsed user with null, and the email with an empty string', () => {
		expect(offlineUserOf({ user: { sub: 'u1' }, claims: {} })).toEqual({
			sub: 'u1',
			email: '',
			preferred_username: null,
			family_name: null,
			given_name: null,
			locale: null,
			phone: null,
			hasPassword: null,
			mfaVerificationFactors: null,
			ssoIdentities: null,
			socialIdentities: null
		});
	});

	test('passes the parsed user through', () => {
		const user = {
			sub: 'u1',
			email: 'a@b.de',
			preferred_username: 'ab',
			family_name: 'B',
			given_name: 'A',
			locale: 'de',
			phone: '+49123'
		};
		expect(offlineUserOf({ user, claims: {} })).toMatchObject(user);
	});

	test('reads the provider claims that have the expected shape', () => {
		const sso = [{ issuer: 'https://idp', identityId: 'x' }];
		expect(
			offlineUserOf({
				user: { sub: 'u1' },
				claims: {
					password: true,
					mfa: ['totp'],
					sso_identities: sso,
					social_identities: ['github']
				}
			})
		).toMatchObject({
			hasPassword: true,
			mfaVerificationFactors: ['totp'],
			ssoIdentities: sso,
			socialIdentities: ['github']
		});
	});

	test('yields null for claims a provider reshapes', () => {
		expect(
			offlineUserOf({
				user: { sub: 'u1' },
				claims: {
					password: 'yes',
					mfa: ['totp', 1],
					sso_identities: [{ issuer: 'https://idp' }, null],
					social_identities: 'github'
				}
			})
		).toMatchObject({
			hasPassword: null,
			mfaVerificationFactors: null,
			ssoIdentities: null,
			socialIdentities: null
		});
	});
});
