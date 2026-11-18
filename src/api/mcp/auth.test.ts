import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';

const ISSUER = 'https://idp.example/oidc';
const RESOURCE = new URL('https://delegator.example/mcp');

vi.mock('$app/env/private', () => ({
	MCP_RESOURCE: 'https://delegator.example/mcp',
	MCP_SCOPES: undefined,
	OIDC_ROLE_CLAIM: 'roles',
	OIDC_ROLE_MAP: undefined
}));
vi.mock('$app/env/public', () => ({
	PUBLIC_OIDC_AUTHORITY: 'https://idp.example/oidc/.well-known/openid-configuration'
}));

const { isMcpEndpoint, protectedResourceMetadata, resourceOfMetadataPath, verifyMcpAccessToken } =
	await import('./auth');

let privateKey: CryptoKey;
const realFetch = globalThis.fetch;

beforeAll(async () => {
	const keys = await generateKeyPair('RS256');
	privateKey = keys.privateKey;
	const jwk = { ...(await exportJWK(keys.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
	globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
		const url = input instanceof Request ? input.url : String(input);
		if (url.endsWith('/.well-known/openid-configuration')) {
			return Response.json({ issuer: ISSUER, jwks_uri: `${ISSUER}/jwks` });
		}
		if (url === `${ISSUER}/jwks`) return Response.json({ keys: [jwk] });
		return new Response('not found', { status: 404 });
	});
});

afterAll(() => {
	globalThis.fetch = realFetch;
});

function token({
	audience = RESOURCE.href,
	issuer = ISSUER,
	expiresIn = '1h',
	claims = {}
}: {
	audience?: string;
	issuer?: string;
	expiresIn?: string;
	claims?: Record<string, unknown>;
} = {}) {
	return new SignJWT({ client_id: 'claude', scope: 'mcp', ...claims })
		.setProtectedHeader({ alg: 'RS256', kid: 'k1' })
		.setSubject('user-1')
		.setIssuer(issuer)
		.setAudience(audience)
		.setIssuedAt()
		.setExpirationTime(expiresIn)
		.sign(privateKey);
}

describe('verifyMcpAccessToken', () => {
	it('accepts a token the provider signed for the MCP server', async () => {
		const info = await verifyMcpAccessToken({ token: await token(), resource: RESOURCE });
		expect(info).toMatchObject({
			clientId: 'claude',
			scopes: ['mcp'],
			resource: RESOURCE,
			extra: { userId: 'user-1', isAdmin: false }
		});
	});

	it('reads the admin role from the role claim', async () => {
		const info = await verifyMcpAccessToken({
			token: await token({ claims: { roles: ['admin'] } }),
			resource: RESOURCE
		});
		expect(info.extra).toEqual({ userId: 'user-1', isAdmin: true });
	});

	it.each([
		['another audience (a token for the app itself)', { audience: 'delegator' }],
		['another issuer', { issuer: 'https://evil.example' }],
		['an expired token', { expiresIn: '-1m' }]
	])('refuses %s', async (_case, options) => {
		await expect(
			verifyMcpAccessToken({ token: await token(options), resource: RESOURCE })
		).rejects.toMatchObject({ code: 'invalid_token' });
	});

	it('refuses a token signed with another key', async () => {
		const other = await generateKeyPair('RS256');
		const forged = await new SignJWT({})
			.setProtectedHeader({ alg: 'RS256', kid: 'k1' })
			.setSubject('user-1')
			.setIssuer(ISSUER)
			.setAudience(RESOURCE.href)
			.setExpirationTime('1h')
			.sign(other.privateKey);
		await expect(verifyMcpAccessToken({ token: forged, resource: RESOURCE })).rejects.toMatchObject(
			{ code: 'invalid_token' }
		);
	});
});

describe('protectedResourceMetadata', () => {
	it('names the provider as authorization server', async () => {
		expect(await protectedResourceMetadata(RESOURCE)).toEqual({
			resource: RESOURCE.href,
			authorization_servers: [ISSUER],
			bearer_methods_supported: ['header'],
			resource_name: 'MUNIFY DELEGATOR'
		});
	});
});

describe('resourceOfMetadataPath', () => {
	it('answers for the server’s own path and for the origin', () => {
		expect(resourceOfMetadataPath('mcp')).toEqual(RESOURCE);
		expect(resourceOfMetadataPath(undefined)).toEqual(RESOURCE);
		expect(resourceOfMetadataPath('')).toEqual(RESOURCE);
	});

	it('answers for nothing else', () => {
		expect(resourceOfMetadataPath('api/graphql')).toBeUndefined();
	});
});

describe('isMcpEndpoint', () => {
	it('names the MCP endpoint, which the session handle passes by', () => {
		expect(isMcpEndpoint('/mcp')).toBe(true);
		expect(isMcpEndpoint('/mcp/')).toBe(true);
		expect(isMcpEndpoint('/mcp-help')).toBe(false);
		expect(isMcpEndpoint('/api/graphql')).toBe(false);
		expect(isMcpEndpoint('/.well-known/oauth-protected-resource/mcp')).toBe(false);
	});
});
