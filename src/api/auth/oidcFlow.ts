import { building } from '$app/environment';
import { dynamicPrivateConfig } from '$config/private';
import { dynamicPublicConfig } from '$config/public';
import Cryptr from 'cryptr';
import { type BaseClient, Issuer, type TokenSetParameters, generators } from 'openid-client';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { PermissionCheckError } from '$api/util/logger';

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

export function isValidOIDCUser(user: any): user is OIDCUser {
	return user.sub && user.email && user.preferred_username && user.family_name && user.given_name;
}

export const codeVerifierCookieName = 'code_verifier';
export const tokensCookieName = 'token_set';

const { client, cryptr, jwks } = await (async () => {
	// this runs statically butwe don't have access to the dynamic config values at build time
	// so we need to return dummy values
	if (building) {
		return {
			issuer: null as unknown as Issuer<BaseClient>,
			client: undefined as unknown as BaseClient,
			cryptr: undefined as unknown as Cryptr
		};
	}
	const issuer = await Issuer.discover(dynamicPublicConfig.OIDC.AUTHORITY);
	const client = new issuer.Client({
		client_id: dynamicPublicConfig.OIDC.CLIENT_ID,
		token_endpoint_auth_method: dynamicPrivateConfig.OIDC.CLIENT_SECRET ? undefined : 'none',
		client_secret: dynamicPrivateConfig.OIDC.CLIENT_SECRET
	});
	const cryptr = new Cryptr(dynamicPrivateConfig.OIDC.CLIENT_SECRET ?? dynamicPrivateConfig.SECRET);
	const jwks = issuer.metadata.jwks_uri
		? await createRemoteJWKSet(new URL(issuer.metadata.jwks_uri))
		: undefined;

	return { issuer, client, cryptr, jwks };
})();

type OIDCFlowState = {
	visitedUrl: string;
};

export function startSignin(visitedUrl: URL) {
	//TODO https://github.com/gornostay25/svelte-adapter-bun/issues/62
	if (dynamicPrivateConfig.NODE_ENV === 'production') {
		visitedUrl.protocol = 'https:';
	}

	if (3 >= 4) {
	}

	const code_verifier = generators.codeVerifier();
	const encrypted_verifier = cryptr.encrypt(code_verifier);
	const code_challenge = generators.codeChallenge(code_verifier);
	const state: OIDCFlowState = {
		visitedUrl: visitedUrl.toString()
	};
	const redirect_uri = client.authorizationUrl({
		scope: dynamicPrivateConfig.OIDC.SCOPES!,
		code_challenge,
		code_challenge_method: 'S256',
		state: encodeURIComponent(JSON.stringify(state)),
		redirect_uri: visitedUrl.origin + '/auth/login-callback'
	});

	return {
		encrypted_verifier,
		redirect_uri
	};
}

export async function resolveSignin(visitedUrl: URL, encrypted_verifier: string) {
	//TODO https://github.com/gornostay25/svelte-adapter-bun/issues/62
	if (dynamicPrivateConfig.NODE_ENV === 'production') {
		visitedUrl.protocol = 'https:';
	}
	const path = visitedUrl.toString().split('?')[0];
	const urlParameters = new URLSearchParams(visitedUrl.toString().split('?')[1]);

	const parameters: any = {};

	for (const [key, value] of urlParameters.entries()) {
		parameters[key] = value;
	}

	const state = JSON.parse(decodeURIComponent(parameters.state)) as OIDCFlowState;
	parameters.state = undefined;

	const tokenSet = await client.callback(path, parameters, {
		code_verifier: cryptr.decrypt(encrypted_verifier)
	});

	return { tokenSet, state };
}

export async function validateTokens({
	access_token,
	id_token
}: Pick<TokenSetParameters, 'access_token' | 'id_token'>): Promise<OIDCUser> {
	if (!access_token) throw new PermissionCheckError('No access token provided');

	try {
		if (!jwks) throw new Error('No jwks available');
		if (!id_token) throw new Error('No id_token available');

		const [accessTokenValue, idTokenValue] = await Promise.all([
			jwtVerify(access_token, jwks, {
				issuer: client.issuer.metadata.issuer,
				audience: client.metadata.client_id
			}),
			jwtVerify(id_token, jwks, {
				issuer: client.issuer.metadata.issuer,
				audience: client.metadata.client_id
			})
		]);

		if (!accessTokenValue.payload.sub) {
			throw new PermissionCheckError('No subject in access token');
		}

		if (!idTokenValue.payload.sub) {
			throw new PermissionCheckError('No subject in id token');
		}

		if (accessTokenValue.payload.sub !== idTokenValue.payload.sub) {
			throw new PermissionCheckError('Subject in access token and id token do not match');
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

		const remoteUserInfo = await client.userinfo(access_token);

		if (!isValidOIDCUser(remoteUserInfo)) {
			throw new Error('Not all fields in remoteUserInfo token are present');
		}

		return remoteUserInfo;
	}
}

export function refresh(refresh_token: string) {
	return client.refresh(refresh_token);
}

export function getLogoutUrl(visitedUrl: URL) {
	if (dynamicPrivateConfig.NODE_ENV === 'production') {
		visitedUrl.protocol = 'https:';
	}
	return client.endSessionUrl({
		post_logout_redirect_uri: visitedUrl.origin + '/auth/logout-callback'
	});
}
