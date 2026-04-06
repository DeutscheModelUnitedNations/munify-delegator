import { building } from '$app/environment';
import { configPrivate } from '$config/private';
import { configPublic } from '$config/public';
import Cryptr from 'cryptr';
import {
	allowInsecureRequests,
	authorizationCodeGrant,
	buildAuthorizationUrl,
	buildEndSessionUrl,
	calculatePKCECodeChallenge,
	discovery,
	fetchUserInfo,
	randomPKCECodeVerifier,
	randomState,
	refreshTokenGrant,
	type TokenEndpointResponse
} from 'openid-client';
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';

export const oidcRoles = ['admin', 'member', 'service_user'] as const;

export type OIDCUser = {
	sub: string;
	email: string;
	preferred_username?: string;
	family_name?: string;
	given_name?: string;

	// non checked fields
	locale?: string;
	phone?: string;

	[key: string]: any;
};

type OIDCFlowState = {
	visitedUrl: string;
	random: string;
};

export function isValidOIDCUser(user: any): user is OIDCUser {
	return !!user.sub && !!user.email;
}

/**
 * Normalize OIDC claims from different providers into a consistent OIDCUser shape.
 * Logto uses `username` instead of `preferred_username` and `name` instead of `family_name`/`given_name`.
 */
function normalizeOIDCClaims(claims: Record<string, any>): Record<string, any> {
	const normalized = { ...claims };

	// Logto: username → preferred_username
	if (!normalized.preferred_username && normalized.username) {
		normalized.preferred_username = normalized.username;
	}

	// Logto: name → family_name + given_name (split on last space)
	if ((!normalized.family_name || !normalized.given_name) && normalized.name) {
		const parts = normalized.name.trim().split(/\s+/);
		if (parts.length >= 2) {
			normalized.given_name = parts.slice(0, -1).join(' ');
			normalized.family_name = parts[parts.length - 1];
		} else {
			normalized.given_name = normalized.name;
			normalized.family_name = normalized.name;
		}
	}

	return normalized;
}

export const codeVerifierCookieName = 'code_verifier';
export const oidcStateCookieName = 'oidc_state';
export const tokensCookieName = 'token_set';

const { config, cryptr, jwks } = await (async () => {
	// this runs statically but we don't have access to the dynamic config values at build time
	// so we need to return dummy values
	if (building) {
		return {
			config: undefined as unknown as Awaited<ReturnType<typeof discovery>>,
			jwks: undefined as unknown as Awaited<ReturnType<typeof createRemoteJWKSet>> | undefined,
			cryptr: undefined as unknown as Cryptr
		};
	}
	const execute: any[] = [];
	if (configPrivate.NODE_ENV === 'development') {
		execute.push(allowInsecureRequests);
	}
	const config = await discovery(
		new URL(configPublic.PUBLIC_OIDC_AUTHORITY),
		configPublic.PUBLIC_OIDC_CLIENT_ID,
		{
			client_secret: configPrivate.OIDC_CLIENT_SECRET,
			token_endpoint_auth_method: configPrivate.OIDC_CLIENT_SECRET ? undefined : 'none'
		},
		undefined,
		{
			execute
		}
	);
	const cryptr = new Cryptr(configPrivate.OIDC_CLIENT_SECRET ?? configPrivate.SECRET);
	const jwks_uri = config.serverMetadata().jwks_uri;
	const jwks = jwks_uri ? await createRemoteJWKSet(new URL(jwks_uri)) : undefined;

	return { config, cryptr, jwks };
})();

/**
 * Get the JWKS for token verification.
 * @returns The JWKS remote set or undefined if not available.
 */
export function getJwks() {
	return jwks;
}

/**
 * Get the OIDC configuration.
 * @returns The OIDC configuration object.
 */
export function getConfig() {
	return config;
}

export async function startSignin(visitedUrl: URL) {
	//TODO https://github.com/gornostay25/svelte-adapter-bun/issues/62
	if (configPrivate.NODE_ENV === 'production') {
		visitedUrl.protocol = 'https:';
	}

	const code_verifier = randomPKCECodeVerifier();
	const encrypted_verifier = cryptr.encrypt(code_verifier);
	const code_challenge = await calculatePKCECodeChallenge(code_verifier);
	const state: OIDCFlowState = {
		visitedUrl: visitedUrl.toString(),
		random: randomState()
	};
	const serialized_state = JSON.stringify(state);
	const encrypted_state = cryptr.encrypt(serialized_state);

	const parameters: Record<string, string> = {
		redirect_uri: `${visitedUrl.origin}/auth/login-callback`,
		scope: configPrivate.OIDC_SCOPES,
		code_challenge,
		code_challenge_method: 'S256',
		state: serialized_state,
		...(configPrivate.OIDC_RESOURCE ? { resource: configPrivate.OIDC_RESOURCE } : {})
	};

	const redirect_uri = buildAuthorizationUrl(config, parameters);

	return {
		encrypted_verifier,
		redirect_uri,
		encrypted_state
	};
}

export async function resolveSignin(
	visitedUrl: URL,
	encrypted_verifier: string,
	encrypted_state: string
) {
	//TODO https://github.com/gornostay25/svelte-adapter-bun/issues/62
	if (configPrivate.NODE_ENV === 'production') {
		visitedUrl.protocol = 'https:';
	}
	const verifier = cryptr.decrypt(encrypted_verifier);
	const state = JSON.parse(cryptr.decrypt(encrypted_state)) as OIDCFlowState;
	const tokens = await authorizationCodeGrant(
		config,
		visitedUrl,
		{
			pkceCodeVerifier: verifier,
			expectedState: JSON.stringify(state)
		},
		configPrivate.OIDC_RESOURCE ? { resource: configPrivate.OIDC_RESOURCE } : undefined
	);
	(state as any).random = undefined;
	const strippedState: Omit<OIDCFlowState, 'random'> = { ...state };

	return { tokens, state: strippedState };
}

/**
 * Verify and decode custom claims from the access token (JWT).
 * Logto injects Custom JWT claims (e.g. roles) into the access token, not the id_token.
 * Verifies the JWT signature against the issuer JWKS when available.
 * Returns the verified payload or an empty object if the token is opaque or verification fails.
 */
async function verifyAccessTokenClaims(access_token: string): Promise<Record<string, unknown>> {
	if (!jwks) {
		return {};
	}
	try {
		// Access tokens use the resource indicator as audience, not the client ID
		const result = await jwtVerify(access_token, jwks, {
			issuer: config.serverMetadata().issuer,
			...(configPrivate.OIDC_RESOURCE ? { audience: configPrivate.OIDC_RESOURCE } : {})
		});
		return result.payload;
	} catch {
		// Token may be opaque or have a non-standard format — skip silently
		return {};
	}
}

export async function validateTokens({
	access_token,
	id_token
}: Pick<TokenEndpointResponse, 'access_token' | 'id_token'>): Promise<OIDCUser> {
	let sub: string | undefined;
	const accessTokenClaims = await verifyAccessTokenClaims(access_token);

	// Try local JWT verification of the id_token first
	if (jwks && id_token) {
		try {
			const idTokenValue = await jwtVerify(id_token, jwks, {
				issuer: config.serverMetadata().issuer,
				audience: configPublic.PUBLIC_OIDC_CLIENT_ID
			});

			// Merge access token claims (e.g. roles) into the id_token payload
			const normalizedPayload = normalizeOIDCClaims({
				...idTokenValue.payload,
				...accessTokenClaims,
				// Preserve id_token's sub/aud/iss over access token's
				sub: idTokenValue.payload.sub,
				aud: idTokenValue.payload.aud,
				iss: idTokenValue.payload.iss
			});
			sub = normalizedPayload.sub;

			if (isValidOIDCUser(normalizedPayload)) {
				return normalizedPayload;
			}

			console.debug(
				'[OIDC] id_token verified but missing profile fields, falling back to userinfo'
			);
		} catch (error: unknown) {
			console.debug(
				`[OIDC] Local id_token verification failed (${error instanceof Error ? error.message : 'unknown'}), trying userinfo endpoint`
			);
		}
	}

	// Fallback: fetch user info from the provider's userinfo endpoint
	const remoteUserInfo = normalizeOIDCClaims({
		...(await fetchUserInfo(config, access_token, sub ?? access_token)),
		...accessTokenClaims
	});

	if (!isValidOIDCUser(remoteUserInfo)) {
		throw new Error('Not all required fields returned from userinfo endpoint');
	}

	return remoteUserInfo as OIDCUser;
}

export function refresh(refresh_token: string) {
	return refreshTokenGrant(config, refresh_token);
}

export function getLogoutUrl(visitedUrl: URL) {
	if (configPrivate.NODE_ENV === 'production') {
		visitedUrl.protocol = 'https:';
	}
	return buildEndSessionUrl(config, {
		post_logout_redirect_uri: visitedUrl.origin + '/auth/logout-callback'
	});
}

/**
 * Obtain an M2M (machine-to-machine) access token for the Logto Management API.
 * Uses client_credentials grant with the M2M app credentials.
 */
async function getM2MAccessToken(): Promise<string> {
	const m2mClientId = configPrivate.OIDC_M2M_CLIENT_ID;
	const m2mClientSecret = configPrivate.OIDC_M2M_CLIENT_SECRET;

	if (!m2mClientId || !m2mClientSecret) {
		throw new Error(
			'Impersonation requires M2M credentials. Set OIDC_M2M_CLIENT_ID and OIDC_M2M_CLIENT_SECRET.'
		);
	}

	// Use configured resource or derive from OIDC authority
	// For Logto Cloud: https://<tenant>.logto.app/api
	// For self-hosted: must be set explicitly via OIDC_M2M_RESOURCE
	const issuer = config.serverMetadata().issuer;
	const managementApiResource =
		configPrivate.OIDC_M2M_RESOURCE ?? `${issuer.replace(/\/oidc\/?$/, '')}/api`;

	const response = await fetch(config.serverMetadata().token_endpoint!, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${Buffer.from(`${m2mClientId}:${m2mClientSecret}`).toString('base64')}`
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			resource: managementApiResource,
			scope: 'all'
		}),
		signal: AbortSignal.timeout(10_000)
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to obtain M2M access token: ${response.status} ${errorText}`);
	}

	const data = await response.json();
	return data.access_token;
}

/**
 * Create a subject token for impersonation via the Logto Management API.
 *
 * @param subjectUserId - The Logto user ID of the user to impersonate.
 * @returns The subject token string to be used in the token exchange.
 */
async function createSubjectToken(subjectUserId: string): Promise<string> {
	const m2mToken = await getM2MAccessToken();

	// Use configured resource or derive from OIDC authority (mirrors getM2MAccessToken)
	const issuer = config.serverMetadata().issuer;
	const managementApiBase =
		configPrivate.OIDC_M2M_RESOURCE ?? `${issuer.replace(/\/oidc\/?$/, '')}/api`;

	const response = await fetch(`${managementApiBase}/subject-tokens`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${m2mToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ userId: subjectUserId }),
		signal: AbortSignal.timeout(10_000)
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to create subject token: ${response.status} ${errorText}`);
	}

	const data = await response.json();
	return data.subjectToken;
}

/**
 * Perform user impersonation via Logto's two-step token exchange flow:
 * 1. Create a subject token via the Logto Management API
 * 2. Exchange that subject token for an access token at the OIDC token endpoint
 *
 * @param actorToken - The actor's access token (for the `act` claim in the resulting JWT).
 * @param subjectUserId - The user ID of the user to impersonate.
 * @param scope - Optional scope to request for the exchanged token.
 * @returns The token endpoint response with the impersonation access token.
 */
export async function performTokenExchange(
	actorToken: string,
	subjectUserId: string,
	scope?: string
): Promise<TokenEndpointResponse> {
	if (!config) {
		throw new Error('OIDC configuration not initialized');
	}

	let actor = 'unknown';
	try {
		const decoded = decodeJwt(actorToken);
		if (decoded.sub) {
			actor = decoded.sub;
		}
	} catch {
		console.warn('Could not determine actor from token for audit purposes.');
	}

	try {
		// Step 1: Create a subject token via the Management API
		const subjectToken = await createSubjectToken(subjectUserId);

		// Step 2: Exchange the subject token for an access token
		// Logto requires: grant_type, subject_token, subject_token_type, resource
		// actor_token is optional (adds `act` claim to the resulting JWT)
		const tokenExchangeParams: Record<string, string> = {
			grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
			subject_token: subjectToken,
			subject_token_type: 'urn:ietf:params:oauth:token-type:access_token'
		};

		// Resource is required for Logto token exchange
		if (configPrivate.OIDC_RESOURCE) {
			tokenExchangeParams.resource = configPrivate.OIDC_RESOURCE;
		}

		// Optional scope parameter
		if (scope) {
			tokenExchangeParams.scope = scope;
		}

		const response = await fetch(config.serverMetadata().token_endpoint!, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				...(configPrivate.OIDC_CLIENT_SECRET
					? {
							Authorization: `Basic ${Buffer.from(`${configPublic.PUBLIC_OIDC_CLIENT_ID}:${configPrivate.OIDC_CLIENT_SECRET}`).toString('base64')}`
						}
					: {})
			},
			body: new URLSearchParams({
				...tokenExchangeParams,
				...(configPrivate.OIDC_CLIENT_SECRET
					? {}
					: { client_id: configPublic.PUBLIC_OIDC_CLIENT_ID })
			}),
			signal: AbortSignal.timeout(10_000)
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorDetail;
			try {
				errorDetail = JSON.parse(errorText);
			} catch {
				errorDetail = errorText;
			}

			if (
				errorDetail?.error === 'unauthorized_client' &&
				errorDetail?.error_description?.includes('token-exchange')
			) {
				throw new Error(
					`OIDC Client not configured for Token Exchange. Please add the grant type 'urn:ietf:params:oauth:grant-type:token-exchange' to your OIDC application configuration.`
				);
			}

			console.error('Token exchange error details:', {
				status: response.status,
				error: errorDetail
			});

			throw new Error(
				`Token exchange failed: ${response.status} ${typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail)}`
			);
		}

		const tokenResponse = await response.json();
		console.info({
			event: 'impersonation_attempt',
			outcome: 'success',
			actor,
			subject: subjectUserId
		});
		return tokenResponse as TokenEndpointResponse;
	} catch (error) {
		console.info({
			event: 'impersonation_attempt',
			outcome: 'failure',
			actor,
			subject: subjectUserId,
			reason: error instanceof Error ? error.message : 'Unknown error'
		});
		console.error('Token exchange error:', error);
		throw new Error(
			`Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}
