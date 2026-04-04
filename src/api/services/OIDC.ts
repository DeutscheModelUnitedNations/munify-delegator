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
 * Try to decode custom claims from the access token (JWT).
 * Logto injects Custom JWT claims (e.g. roles) into the access token, not the id_token.
 * Returns the decoded payload or an empty object if the token is opaque.
 */
function decodeAccessTokenClaims(access_token: string): Record<string, unknown> {
	try {
		return decodeJwt(access_token);
	} catch {
		return {};
	}
}

export async function validateTokens({
	access_token,
	id_token
}: Pick<TokenEndpointResponse, 'access_token' | 'id_token'>): Promise<OIDCUser> {
	let sub: string | undefined;
	const accessTokenClaims = decodeAccessTokenClaims(access_token);

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
 * Perform an OAuth 2.0 Token Exchange to obtain a JWT for acting as a specified subject.
 *
 * @param actorToken - The actor's access token used to authorize the exchange.
 * @param subjectUserId - The user identifier of the subject to impersonate (subject token).
 * @param scope - Optional scope to request for the exchanged token.
 * @param audience - Optional audience to request for the exchanged token.
 * @returns The token endpoint response from the issuer as a `TokenEndpointResponse`.
 * @throws When the OIDC configuration is not initialized, when the token endpoint returns an error (includes provider error details when available), or when the exchange request fails or times out.
 */
export async function performTokenExchange(
	actorToken: string,
	subjectUserId: string,
	scope?: string,
	audience?: string
): Promise<TokenEndpointResponse> {
	if (!config) {
		throw new Error('OIDC configuration not initialized');
	}

	let actor = 'unknown';
	if (jwks) {
		try {
			const { payload } = await jwtVerify(actorToken, jwks);
			if (payload.sub) {
				actor = payload.sub;
			}
		} catch (err) {
			console.warn(
				`Could not determine actor from token for audit purposes: ${
					err instanceof Error ? err.message : 'Unknown error'
				}`
			);
		}
	} else {
		console.warn('No jwks available for decoding actor token for audit purposes.');
	}

	const tokenExchangeParams: Record<string, string> = {
		grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
		subject_token: subjectUserId,
		subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
		actor_token: actorToken,
		actor_token_type: 'urn:ietf:params:oauth:token-type:access_token',
		requested_token_type: 'urn:ietf:params:oauth:token-type:jwt'
	};

	if (scope) {
		tokenExchangeParams.scope = scope;
	}

	if (audience) {
		tokenExchangeParams.audience = audience;
	}

	try {
		// Add a timeout so the token exchange does not hang indefinitely
		const signal = AbortSignal.timeout(10_000); // 10s timeout
		const response = await fetch(config.serverMetadata().token_endpoint!, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
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
			signal
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorDetail;
			try {
				errorDetail = JSON.parse(errorText);
			} catch {
				errorDetail = errorText;
			}

			// Specific error handling for different error types
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
				error: errorDetail,
				tokenExchangeParams: {
					...tokenExchangeParams,
					actor_token: '[REDACTED]',
					subject_token: '[REDACTED]'
				}
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
