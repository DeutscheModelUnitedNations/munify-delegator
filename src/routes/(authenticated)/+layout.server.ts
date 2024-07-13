import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { TokenSet } from 'openid-client';
import {
	userInfo,
	codeVerifierCookieName,
	refresh,
	startSignin,
	tokensCookieName
} from '$api/auth/flow';

export const load: LayoutServerLoad = async ({ url, cookies }) => {
	// are we signed in?
	const existingTokens = cookies.get(tokensCookieName);
	if (existingTokens) {
		let tokens = new TokenSet(JSON.parse(existingTokens));

		if (tokens.expired() && tokens.refresh_token) {
			tokens = await refresh(tokens.refresh_token);
		}

		if (tokens.access_token) {
			const user = await userInfo(tokens.access_token);
			return {
				user,
				nextRefreshDue:
					tokens.expires_at && tokens.refresh_token ? new Date(tokens.expires_at * 1000) : undefined
			};
		}
	}

	// if not, start the signin process
	const { encrypted_verifier, redirect_uri } = startSignin({
		visitedUrl: url.toString()
	});

	cookies.set(codeVerifierCookieName, encrypted_verifier, {
		sameSite: 'lax',
		maxAge: 60 * 5,
		path: '/'
	});

	redirect(302, redirect_uri);
};
