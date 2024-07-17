import { codeVerifierCookieName, resolveSignin, tokensCookieName } from '$api/auth/flow';
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import type { TokenSetParameters } from 'openid-client';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const verifier = cookies.get(codeVerifierCookieName);
	if (!verifier) error(400, 'No code verifier cookie found.');

	const { state, tokenSet } = await resolveSignin(url.toString(), verifier);

	cookies.set(tokensCookieName, JSON.stringify(tokenSet as TokenSetParameters), {
		//TODO investigate if we can use 'strict' here somehow
		// we need lax to allow the token to be sent with redirect from the auth provider
		sameSite: 'lax',
		path: '/',
		expires: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined
	});

	cookies.delete(codeVerifierCookieName, { path: '/' });

	redirect(302, state.visitedUrl);
};
