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
	tokenIntrospection,
	type TokenEndpointResponse
} from 'openid-client';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const oidcRoles = ['admin', 'member', 'service_user'] as const;

export type OIDCUser = {
	sub: string;
	email: string;
	preferred_username: string;
	family_name: string;
	given_name: string;

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
	return user.sub && user.email && user.preferred_username && user.family_name && user.given_name;
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
	const execute = [];
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
		redirect_uri: visitedUrl.origin + '/auth/login-callback',
		scope: configPrivate.OIDC_SCOPES,
		code_challenge,
		code_challenge_method: 'S256',
		state: serialized_state
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
	const tokens = await authorizationCodeGrant(config, visitedUrl, {
		pkceCodeVerifier: verifier,
		expectedState: JSON.stringify(state)
	});
	(state as any).random = undefined;
	const strippedState: Omit<OIDCFlowState, 'random'> = { ...state };

	return { tokens, state: strippedState };
}

export async function validateTokens({
	access_token,
	id_token
}: Pick<TokenEndpointResponse, 'access_token' | 'id_token'>): Promise<OIDCUser> {
	try {
		if (!jwks) throw new Error('No jwks available');
		if (!id_token) throw new Error('No id_token available');

		const [accessTokenValue, idTokenValue] = await Promise.all([
			jwtVerify(access_token, jwks, {
				issuer: config.serverMetadata().issuer,
				audience: configPublic.PUBLIC_OIDC_CLIENT_ID
			}),
			jwtVerify(id_token, jwks, {
				issuer: config.serverMetadata().issuer,
				audience: configPublic.PUBLIC_OIDC_CLIENT_ID
			})
		]);

		if (!accessTokenValue.payload.sub) {
			throw new Error('No subject in access token');
		}

		if (!idTokenValue.payload.sub) {
			throw new Error('No subject in id token');
		}

		if (accessTokenValue.payload.sub !== idTokenValue.payload.sub) {
			throw new Error('Subject in access token and id token do not match');
		}

		// some basic fields which we want to be present
		// if the id token is configured in a way that it does not contain these fields
		// we instead want to use the userinfo endpoint
		if (!isValidOIDCUser(idTokenValue.payload)) {
			throw new Error('Not all fields in id token are present');
		}

		return idTokenValue.payload;
	} catch (error: any) {
		console.warn(
			'Failed to verify tokens locally, falling back to less performant info fetch:',
			error.message
		);

		const remoteUserInfo = await tokenIntrospection(config, access_token);

		if (!isValidOIDCUser(remoteUserInfo)) {
			throw new Error('Not all fields in remoteUserInfo token are present');
		}

		return remoteUserInfo;
	}
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

export function fetchUserInfoFromIssuer(access_token: string, expectedSubject: string) {
	return fetchUserInfo(config, access_token, expectedSubject);
}
