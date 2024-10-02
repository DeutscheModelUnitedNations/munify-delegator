import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { codeVerifierCookieName, startSignin } from '$api/auth/oidcFlow';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { checkForError } from '$api/client';
import { dynamicPrivateConfig } from '$config/private';

//TODO: investiagte this
// https://youtu.be/K1Tya6ovVOI?si=HFPf8-z_L9ppiTqc&t=903
// we should not use load functions for authentication
// instead we should use server hooks to protect routes based on the url?

//TODO best would be to put all this logic in an elysia handler
export const load: LayoutServerLoad = loadApiHandler(async ({ api, url, cookies }) => {
	const { nextTokenRefreshDue, user } = await checkForError(api.auth['refresh-user'].get());

	if (user) {
		return { nextTokenRefreshDue, user };
	}

	//TODO https://github.com/gornostay25/svelte-adapter-bun/issues/62
	const { encrypted_verifier, redirect_uri } = startSignin(url);

	cookies.set(codeVerifierCookieName, encrypted_verifier, {
		sameSite: 'lax',
		maxAge: 60 * 5,
		path: '/',
		secure: true,
		httpOnly: true
	});

	redirect(302, redirect_uri);
});
