import { describe, expect, test, vi } from 'vitest';
import type { OIDCSession } from '@m1212e/sveltekit-oidc';
import { createUserInfoClaims } from './userInfoClaims';

function session(accessTokenClaims: Record<string, unknown>, accessToken = 'token'): OIDCSession {
	return {
		user: { sub: 'a', iss: 'https://idp.example' },
		accessTokenClaims: { sub: 'a', ...accessTokenClaims },
		idTokenClaims: undefined,
		actors: [],
		tokens: { accessToken }
	};
}

describe('userInfoClaims', () => {
	test('asks only when the tokens lack the claim', async () => {
		const claims = createUserInfoClaims();
		const fetchUserInfo = vi.fn(async () => ({ sub: 'a', groups: ['admin'] }));

		const withClaim = session({ groups: ['member'] });
		await claims.load(withClaim, 'groups', fetchUserInfo);
		expect(fetchUserInfo).not.toHaveBeenCalled();
		expect(claims.of(withClaim)).toBeUndefined();

		const without = session({});
		await claims.load(without, 'groups', fetchUserInfo);
		expect(fetchUserInfo).toHaveBeenCalledWith('token', 'a');
		expect(claims.of(without)).toEqual({ sub: 'a', groups: ['admin'] });
	});

	test('asks once per access token until it expires, at most five minutes', async () => {
		let time = 0;
		const claims = createUserInfoClaims(() => time);
		const fetchUserInfo = vi.fn(async () => ({ sub: 'a' }));

		await Promise.all([
			claims.load(session({}), 'groups', fetchUserInfo),
			claims.load(session({}), 'groups', fetchUserInfo)
		]);
		expect(fetchUserInfo).toHaveBeenCalledTimes(1);

		time = 5 * 60 * 1000;
		await claims.load(session({}), 'groups', fetchUserInfo);
		expect(fetchUserInfo).toHaveBeenCalledTimes(2);

		await claims.load(session({ exp: 5 * 60 + 10 }, 'short'), 'groups', fetchUserInfo);
		time += 10 * 1000;
		await claims.load(session({ exp: 5 * 60 + 10 }, 'short'), 'groups', fetchUserInfo);
		expect(fetchUserInfo).toHaveBeenCalledTimes(4);
	});

	test('remembers a failure for a minute and grants nothing meanwhile', async () => {
		let time = 0;
		const claims = createUserInfoClaims(() => time);
		const fetchUserInfo = vi.fn(async () => {
			throw new Error('down');
		});
		vi.spyOn(console, 'warn').mockImplementation(() => {});

		const s = session({});
		await claims.load(s, 'groups', fetchUserInfo);
		await claims.load(s, 'groups', fetchUserInfo);
		expect(fetchUserInfo).toHaveBeenCalledTimes(1);
		expect(claims.of(s)).toBeUndefined();

		time = 60 * 1000;
		await claims.load(s, 'groups', fetchUserInfo);
		expect(fetchUserInfo).toHaveBeenCalledTimes(2);
	});
});
