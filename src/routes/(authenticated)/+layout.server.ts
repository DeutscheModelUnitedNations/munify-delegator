import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { TokenSet, type TokenSetParameters } from 'openid-client';
import {
	userInfo,
	codeVerifierCookieName,
	refresh,
	startSignin,
	tokensCookieName
} from '$api/auth/flow';
import type { TokenCookieSchemaType } from '$api/auth/oidc';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	// are we signed in?
	const existingTokens = cookies.get(tokensCookieName);
	if (existingTokens) {
		let tokenSet = new TokenSet(JSON.parse(existingTokens));

		if (tokenSet.expired() && tokenSet.refresh_token) {
			tokenSet = await refresh(tokenSet.refresh_token);

			const cookieValue: TokenCookieSchemaType = {
				access_token: tokenSet.access_token,
				expires_at: tokenSet.expires_at,
				id_token: tokenSet.id_token,
				refresh_token: tokenSet.refresh_token,
				scope: tokenSet.scope,
				session_state: tokenSet.session_state,
				token_type: tokenSet.token_type
			};

			cookies.set(tokensCookieName, JSON.stringify(cookieValue), {
				//TODO investigate if we can use 'strict' here somehow
				// we need lax to allow the token to be sent with redirect from the auth provider
				sameSite: 'lax',
				path: '/',
				expires: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined
			});
		}

		if (tokenSet.access_token) {
			const user = await userInfo(tokenSet.access_token);
			return {
				user,
				nextRefreshDue:
					tokenSet.expires_at && tokenSet.refresh_token
						? new Date(tokenSet.expires_at * 1000)
						: undefined
			};
		}
	}
	// if not, start the signin process

	//TODO https://github.com/gornostay25/svelte-adapter-bun/issues/62
	const { encrypted_verifier, redirect_uri } = startSignin(url);

	cookies.set(codeVerifierCookieName, encrypted_verifier, {
		sameSite: 'lax',
		maxAge: 60 * 5,
		path: '/'
	});

	redirect(302, redirect_uri);
};
