import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import {
	OAuthError,
	OAuthErrorCode,
	type AuthInfo,
	type OAuthProtectedResourceMetadata
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import { MCP_RESOURCE, MCP_SCOPES, OIDC_ROLE_CLAIM, OIDC_ROLE_MAP } from '$app/env/private';
import { PUBLIC_OIDC_AUTHORITY } from '$app/env/public';
import { appRolesOf, roleNamesInClaims } from '#api/services/oidc/roleClaims';
import { logger } from '#lib/logger';

/**
 * How an AI assistant signs in to the MCP server: OAuth 2.1 with the app's own OIDC provider
 * (Logto) as authorization server. `/mcp` is a protected resource (RFC 9728): it names the
 * provider in its metadata, the client gets an access token for the API resource `MCP_RESOURCE`
 * there - the person signs in as themselves - and every request carries it as a bearer token,
 * checked here against the provider's keys. The token's `sub` is the user's id.
 */

/** The MCP server's public URL, or undefined while it is switched off. */
export function mcpResourceUrl() {
	return MCP_RESOURCE ? new URL(MCP_RESOURCE) : undefined;
}

const discoverySchema = z.object({
	issuer: z.string(),
	jwks_uri: z.string().url()
});

type Provider = z.infer<typeof discoverySchema> & {
	keys: ReturnType<typeof createRemoteJWKSet>;
	/** The discovery document as the provider sent it. */
	document: Record<string, unknown>;
};

/**
 * Where the provider's discovery document is. `PUBLIC_OIDC_AUTHORITY` may be the issuer
 * (`https://logto.example/oidc`) or the document itself; like openid-client, which the sign-in uses,
 * an issuer gets `/.well-known/openid-configuration` appended (OIDC Discovery §4).
 */
export function discoveryUrl(authority: string) {
	const url = new URL(authority);
	if (url.href.includes('/.well-known/')) return url;
	url.pathname = `${url.pathname.replace(/\/+$/, '')}/.well-known/openid-configuration`;
	return url;
}

let provider: Promise<Provider> | undefined;

/** How long the provider's discovery may take before a request gives up (and the next retries). */
const DISCOVERY_TIMEOUT_MS = 10_000;

/** The provider's discovery document and its keys, fetched once; again after a failure. */
function oidcProvider(): Promise<Provider> {
	provider ??= (async () => {
		// The signal also ends reading the body, so a stalled provider cannot hold every request.
		const response = await fetch(discoveryUrl(PUBLIC_OIDC_AUTHORITY), {
			signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS)
		});
		if (!response.ok) throw new Error(`OIDC discovery answered ${response.status}`);
		const document = z.record(z.string(), z.unknown()).parse(await response.json());
		const discovery = discoverySchema.parse(document);
		return { ...discovery, document, keys: createRemoteJWKSet(new URL(discovery.jwks_uri)) };
	})();
	provider.catch(() => {
		provider = undefined;
	});
	return provider;
}

/**
 * The MCP server's URL when `path` (after `/.well-known/oauth-protected-resource`) asks for its
 * metadata: its own path, or none for clients that probe the origin. Undefined while it is off.
 */
export function resourceOfMetadataPath(path: string | undefined) {
	const resource = mcpResourceUrl();
	const suffix = path ? `/${path}` : '';
	return resource && (!suffix || suffix === resource.pathname) ? resource : undefined;
}

/** The RFC 9728 document MCP clients read to find where to sign in. */
export async function protectedResourceMetadata(
	resource: URL
): Promise<OAuthProtectedResourceMetadata> {
	const { issuer } = await oidcProvider();
	const scopes = MCP_SCOPES?.split(' ').filter(Boolean);
	return {
		resource: resource.href,
		authorization_servers: [issuer],
		bearer_methods_supported: ['header'],
		resource_name: 'MUNIFY DELEGATOR',
		...(scopes?.length ? { scopes_supported: scopes } : {})
	};
}

/** The provider's discovery document, served as authorization server metadata (RFC 8414). */
export async function authorizationServerMetadata() {
	return (await oidcProvider()).document;
}

/** Whether the token's role claim (`OIDC_ROLE_CLAIM`) makes its holder a system admin. */
function isAdminToken(payload: JWTPayload) {
	if (!OIDC_ROLE_CLAIM) return false;
	const names = roleNamesInClaims({ sources: [payload], path: OIDC_ROLE_CLAIM });
	return appRolesOf({ names, roleMap: OIDC_ROLE_MAP }).includes('admin');
}

/** What the MCP endpoint keeps of a verified token, in `AuthInfo.extra`. */
export const mcpPrincipalSchema = z.object({ userId: z.string().min(1), isAdmin: z.boolean() });

/**
 * Verifies an assistant's bearer token: a JWT the provider signed, for `resource`, unexpired.
 * Throws `invalid_token` otherwise, which the endpoint answers with a 401 challenge naming the
 * metadata, so the client signs in (again).
 */
export async function verifyMcpAccessToken({
	token,
	resource
}: {
	token: string;
	resource: URL;
}): Promise<AuthInfo> {
	const { issuer, keys } = await oidcProvider();
	let payload: JWTPayload;
	try {
		({ payload } = await jwtVerify(token, keys, { issuer, audience: resource.href }));
	} catch (error) {
		logger.info('An MCP access token was refused', { reason: String(error) });
		throw new OAuthError(OAuthErrorCode.InvalidToken, 'The access token is invalid or expired.');
	}
	if (!payload.sub || !payload.exp) {
		throw new OAuthError(OAuthErrorCode.InvalidToken, 'The access token names no user.');
	}
	const clientId = z.string().safeParse(payload.client_id ?? payload.azp);
	const scope = z.string().safeParse(payload.scope);
	return {
		token,
		clientId: clientId.success ? clientId.data : 'unknown',
		scopes: scope.success ? scope.data.split(' ').filter(Boolean) : [],
		expiresAt: payload.exp,
		resource,
		extra: mcpPrincipalSchema.parse({ userId: payload.sub, isAdmin: isAdminToken(payload) })
	};
}
