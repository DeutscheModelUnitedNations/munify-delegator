import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
	OIDC_ROLE_CLAIM: 'roles',
	OIDC_ROLE_MAP: { chase: ['munify-chase'] }
}));
vi.mock('$app/env/public', () => ({ PUBLIC_OIDC_AUTHORITY: 'https://idp.example' }));

const { linkConfigOf, rolesOfToken } = await import('./linkAuth');

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

describe('linkConfigOf', () => {
	const complete = {
		LINK_REMOTE_URL: 'https://chase.example/some/path',
		LINK_REMOTE_RESOURCE: 'https://chase.example/api',
		'LINK_RESOURCE or OIDC_RESOURCE': 'https://delegator.example/api',
		OIDC_M2M_CLIENT_ID: 'client',
		OIDC_M2M_CLIENT_SECRET: 'secret'
	};

	test('is off without a word while no CHASE is named', () => {
		expect(linkConfigOf({ OIDC_M2M_CLIENT_ID: 'client' })).toEqual({
			missing: [],
			config: undefined
		});
	});

	test('names what is missing while the link is only partly set', () => {
		expect(
			linkConfigOf({ LINK_REMOTE_URL: 'https://chase.example', OIDC_M2M_CLIENT_SECRET: '' })
		).toEqual({
			missing: [
				'LINK_REMOTE_RESOURCE',
				'LINK_RESOURCE or OIDC_RESOURCE',
				'OIDC_M2M_CLIENT_ID',
				'OIDC_M2M_CLIENT_SECRET'
			],
			config: undefined
		});
	});

	test('answers the configuration, the remote by its origin', () => {
		expect(linkConfigOf(complete)).toEqual({
			missing: [],
			config: {
				remoteUrl: 'https://chase.example',
				remoteResource: 'https://chase.example/api',
				resource: 'https://delegator.example/api',
				clientId: 'client',
				clientSecret: 'secret'
			}
		});
	});
});
