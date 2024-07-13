import type { PageServerLoad } from './$types';
import { codeVerifierCookieName, resolveSignin, tokensCookieName } from '$lib/auth/oidc';
import { error, redirect } from '@sveltejs/kit';
import type { TokenSetParameters } from 'openid-client';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const verifier = cookies.get(codeVerifierCookieName);
	if (!verifier) error(400, 'No code verifier cookie found.');

	const { state, tokenSet } = await resolveSignin(url.toString(), verifier);

	cookies.set(tokensCookieName, JSON.stringify(tokenSet as TokenSetParameters), {
		sameSite: 'strict',
		path: '/',
		expires: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined
	});

	cookies.delete(codeVerifierCookieName, { path: '/' });

	redirect(302, state.visitedUrl);
};
