import { privateConfig } from '$config/private';
import { publicConfig } from '$config/public';
import Cryptr from 'cryptr';
import { Issuer } from 'openid-client';
import { generators } from 'openid-client';

export const codeVerifierCookieName = 'code_verifier';
export const tokensCookieName = 'token_set';

const issuer = await Issuer.discover(publicConfig.OIDC.AUTHORITY);
const client = new issuer.Client({
	client_id: publicConfig.OIDC.CLIENT_ID,
	token_endpoint_auth_method: privateConfig.OIDC.CLIENT_SECRET ? undefined : 'none',
	client_secret: privateConfig.OIDC.CLIENT_SECRET
});
const cryptr = new Cryptr(privateConfig.OIDC.CLIENT_SECRET ?? privateConfig.SECRET);

export type OIDCFlowState = {
	visitedUrl: string;
};

export function startSignin(state: OIDCFlowState) {
	const code_verifier = generators.codeVerifier();
	const encrypted_verifier = cryptr.encrypt(code_verifier);
	const code_challenge = generators.codeChallenge(code_verifier);
	const redirect_uri = client.authorizationUrl({
		scope: 'openid email profile',
		code_challenge,
		code_challenge_method: 'S256',
		state: encodeURIComponent(JSON.stringify(state)),
		redirect_uri: publicConfig.HOSTNAME
			? publicConfig.HOSTNAME + '/auth/login-callback'
			: new URL(state.visitedUrl).origin + '/auth/login-callback'
	});

	return {
		encrypted_verifier,
		redirect_uri
	};
}

export async function resolveSignin(url: string, encrypted_verifier: string) {
	const path = url.split('?')[0];
	const urlParameters = new URLSearchParams(url.split('?')[1]);

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