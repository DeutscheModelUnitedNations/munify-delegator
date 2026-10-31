import { beforeEach, describe, expect, test, vi } from 'vitest';

const offlineUserRefresh = vi.fn();
const myOIDCRoles = vi.fn();

vi.mock('./rumbleClient/client', () => ({
	client: { query: { offlineUserRefresh, myOIDCRoles } }
}));

const { fetchCurrentUser } = await import('./currentUser');

const claims = {
	sub: 'u1',
	email: 'ada@example.org',
	family_name: 'Lovelace',
	given_name: 'Ada',
	locale: 'de',
	phone: null,
	preferred_username: 'ada',
	hasPassword: true,
	mfaVerificationFactors: ['Totp'],
	ssoIdentities: [{ issuer: 'https://sso.example.org', identityId: 'x', extra: 1 }],
	socialIdentities: ['github']
};

beforeEach(() => {
	myOIDCRoles.mockResolvedValue(['member']);
});

describe('fetchCurrentUser', () => {
	test('copies the claims and the roles into a plain object', async () => {
		offlineUserRefresh.mockResolvedValue({ user: claims });
		myOIDCRoles.mockResolvedValue(['admin']);
		expect(await fetchCurrentUser()).toEqual({
			sub: 'u1',
			email: 'ada@example.org',
			family_name: 'Lovelace',
			given_name: 'Ada',
			locale: 'de',
			phone: null,
			preferred_username: 'ada',
			hasPassword: true,
			mfaVerificationFactors: ['Totp'],
			ssoIdentities: [{ issuer: 'https://sso.example.org', identityId: 'x' }],
			socialIdentities: ['github'],
			myOIDCRoles: ['admin'],
			isAdmin: true
		});
	});

	test('reads lists the provider left out as empty', async () => {
		offlineUserRefresh.mockResolvedValue({
			user: { ...claims, mfaVerificationFactors: null, ssoIdentities: null, socialIdentities: null }
		});
		const user = await fetchCurrentUser();
		expect(user.mfaVerificationFactors).toEqual([]);
		expect(user.ssoIdentities).toEqual([]);
		expect(user.socialIdentities).toEqual([]);
		expect(user.isAdmin).toBe(false);
	});

	test('fails when nobody is signed in', async () => {
		offlineUserRefresh.mockResolvedValue({ user: null });
		await expect(fetchCurrentUser()).rejects.toThrow('Not signed in');
	});
});
