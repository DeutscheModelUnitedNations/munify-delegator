import { codeVerifierCookieName, resolveSignin, tokensCookieName } from '$api/auth/oidcFlow';
import type { TokenCookieSchemaType } from '$api/auth/oidcPlugin';
import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

//TODO best would be to put all this logic in an elysia handler
export const load: PageServerLoad = loadApiHandler(async ({ url, cookies, api }) => {
	const verifier = cookies.get(codeVerifierCookieName);
	if (!verifier) error(400, 'No code verifier cookie found.');

	const { state, tokenSet } = await resolveSignin(url, verifier);

	// we want to ensure throughout the app we match the TokenCookieSchemaType
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
		expires: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined,
		secure: true,
		httpOnly: true
	});

	cookies.delete(codeVerifierCookieName, { path: '/' });

	const { userNeedsAdditionalInfo } = await checkForError(api.user['upsert-after-login'].patch());

	if (userNeedsAdditionalInfo) {
		redirect(302, `/my-account?redirect=${encodeURIComponent(state.visitedUrl)}`);
	} else {
		redirect(302, state.visitedUrl);
	}
});
