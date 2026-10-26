import { describe, expect, test, vi } from 'vitest';
import type { OIDCSession } from '@m1212e/sveltekit-oidc';

vi.mock('$app/env/private', () => ({ OIDC_ROLE_CLAIM: 'roles' }));
vi.mock('./services/OIDC', () => ({ oidcRoles: ['admin', 'member', 'service_user'] }));

const { effectiveRoles, rolesOfSession } = await import('./context');

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
