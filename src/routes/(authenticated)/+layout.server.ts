import type { LayoutServerLoad } from './$types';
import { codeVerifierCookieName, oidcStateCookieName, startSignin } from '$api/services/OIDC';
import { redirect } from '@sveltejs/kit';
import { fastUserQuery } from '$lib/queries/fastUserQuery';

//TODO: a more clean approach would be to do this inside the api and not
// in the layout server
//TODO: investiagte this
// https://youtu.be/K1Tya6ovVOI?si=HFPf8-z_L9ppiTqc&t=903
// we should not use load functions for authentication
// instead we should use server hooks to protect routes based on the url?

export const load: LayoutServerLoad = async (event) => {
	const { data } = await fastUserQuery.fetch({ event, blocking: true });

	if (data?.offlineUserRefresh.user) {
		return {
			nextTokenRefreshDue: data.offlineUserRefresh,
			user: { ...data.offlineUserRefresh.user, myOIDCRoles: data.myOIDCRoles }
		};
	}

	const { encrypted_state, encrypted_verifier, redirect_uri } = await startSignin(event.url);

	event.cookies.set(codeVerifierCookieName, encrypted_verifier, {
		sameSite: 'lax',
		maxAge: 60 * 5,
		path: '/',
		secure: true,
		httpOnly: true
	});

	event.cookies.set(oidcStateCookieName, encrypted_state, {
		sameSite: 'lax',
		maxAge: 60 * 5,
		path: '/',
		secure: true,
		httpOnly: true
	});

	throw redirect(302, redirect_uri);
};
