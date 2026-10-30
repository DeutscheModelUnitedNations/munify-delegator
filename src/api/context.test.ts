import { describe, expect, test, vi } from 'vitest';
import type { OIDCSession } from '@m1212e/sveltekit-oidc';

vi.mock('$app/env/private', () => ({ OIDC_ROLE_CLAIM: 'roles', OIDC_ROLE_MAP: undefined }));

const { effectiveRoles, rolesOfSession, sessionClaims, sessionUser } = await import('./context');

function session(sub: string, roles: unknown, impersonator?: OIDCSession): OIDCSession {
	return {
		user: { sub, iss: 'https://idp.example' },
		accessTokenClaims: { sub, roles },
		idTokenClaims: undefined,
		actors: impersonator ? [{ sub: impersonator.user.sub }] : [],
		tokens: {},
		impersonator
	};
}

describe('rolesOfSession', () => {
	test('reads the known system roles from the claim', () => {
		expect(rolesOfSession(session('a', ['admin', 'unknown']))).toEqual(['admin']);
		expect(rolesOfSession(undefined)).toEqual([]);
	});
});

describe('effectiveRoles', () => {
	test('is the session’s own roles without an impersonation', () => {
		expect(effectiveRoles(session('a', ['admin', 'member']))).toEqual(['admin', 'member']);
	});

	test('never lends the impersonated user’s roles to the impersonator', () => {
		const careMember = session('care', ['member']);
		expect(effectiveRoles(session('target-admin', ['admin', 'member'], careMember))).toEqual([
			'member'
		]);
	});

	test('never keeps the impersonator’s roles for the impersonated user', () => {
		const admin = session('admin', ['admin']);
		expect(effectiveRoles(session('participant', [], admin))).toEqual([]);
	});
});

describe('sessionUser', () => {
	test('is nobody without a session', () => {
		expect(sessionUser({}, [])).toBeUndefined();
	});

	test("is the session's user with its roles", () => {
		const user = sessionUser({ oidc: session('a', ['admin']) }, ['admin']);
		expect(user).toMatchObject({ sub: 'a', email: undefined, OIDCRoleNames: ['admin'] });
		expect(user?.hasRole('admin')).toBe(true);
		expect(user?.hasRole('member')).toBe(false);
	});

	test("takes the impersonated user's identity from their row, keeping the token's sub", () => {
		const user = sessionUser(
			{
				oidc: session('target', [], session('care', ['member'])),
				impersonatedIdentity: { email: 'target@example.org', given_name: 'T', family_name: 'U' }
			},
			[]
		);
		expect(user).toMatchObject({ sub: 'target', email: 'target@example.org', given_name: 'T' });
	});

	test('ignores a loaded identity while nobody is impersonated', () => {
		const user = sessionUser(
			{
				oidc: session('a', []),
				impersonatedIdentity: { email: 'other@example.org', given_name: 'O', family_name: 'P' }
			},
			[]
		);
		expect(user?.email).toBeUndefined();
		expect(user).not.toHaveProperty('given_name');
	});
});

describe('sessionClaims', () => {
	test('merges both tokens, the access token winning', () => {
		const own = session('a', ['admin']);
		expect(
			sessionClaims({ ...own, idTokenClaims: { sub: 'a', roles: 'id', name: 'Ada' } })
		).toEqual({ sub: 'a', roles: ['admin'], name: 'Ada' });
	});

	test('is empty without a session', () => {
		expect(sessionClaims(undefined)).toEqual({});
	});
});
