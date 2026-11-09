import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
	OIDC_ROLE_CLAIM: 'roles',
	OIDC_ROLE_MAP: { chase: ['munify-chase'] }
}));
vi.mock('$app/env/public', () => ({ PUBLIC_OIDC_AUTHORITY: 'https://idp.example' }));

const { rolesOfToken } = await import('./linkAuth');

describe('rolesOfToken', () => {
	test('grants the link role through the role claim, as OIDC_ROLE_MAP names it', () => {
		expect(rolesOfToken({ roles: ['munify-chase'] })).toEqual(['chase']);
	});

	test('grants it as a scope, which is how Logto hands an M2M app its permissions', () => {
		expect(rolesOfToken({ scope: 'read munify-chase' })).toEqual(['chase']);
	});

	test('grants nothing for a name the map does not use', () => {
		expect(rolesOfToken({ roles: ['chase'], scope: 'chase' })).toEqual([]);
		expect(rolesOfToken({})).toEqual([]);
	});
});
