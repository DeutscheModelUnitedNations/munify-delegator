import { building } from '$app/environment';
import { dynamicPrivateConfig } from '$config/private';
import { dynamicPublicConfig } from '$config/public';
import Cryptr from 'cryptr';
import { t } from 'elysia';
import { type BaseClient, Issuer, generators } from 'openid-client';

export const codeVerifierCookieName = 'code_verifier';
export const tokensCookieName = 'token_set';

const { client, cryptr } = await (async () => {
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

	return { issuer, client, cryptr };
})();

type OIDCFlowState = {
	visitedUrl: string;
};

export function startSignin(visitedUrl: URL) {
	const code_verifier = generators.codeVerifier();
	const encrypted_verifier = cryptr.encrypt(code_verifier);
	const code_challenge = generators.codeChallenge(code_verifier);
	const state: OIDCFlowState = {
		visitedUrl: visitedUrl.toString()
	};
	const redirect_uri = client.authorizationUrl({
		scope: 'openid email profile',
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

export function userInfo(access_token: string) {
	return client.userinfo(access_token);
}

export function refresh(refresh_token: string) {
	return client.refresh(refresh_token);
}
