import { makeCookieNames } from '@m1212e/sveltekit-oidc';
import type { RequestEvent } from '@sveltejs/kit';
import { OIDC_RESOURCE } from '$app/env/private';
import { OIDC, sessionCookieOptions } from './OIDC';
import { plainAccessToken } from './plainAccessToken';

/** `plainAccessToken` for the session of `event`, which has to be signed in. */
export function actorAccessTokenOf(event: RequestEvent): Promise<string> {
	const tokens = event.locals.oidc?.tokens;
	if (!tokens) throw new Error('not signed in');
	return plainAccessToken({
		tokens,
		resourceConfigured: !!OIDC_RESOURCE,
		// The core's own refresh would ask for OIDC_RESOURCE again, so this one goes to the
		// provider directly, with the client authentication the core set up. Through the core's own
		// openid-client: any other copy rejects its configuration as not a `Configuration`
		refreshWithoutResource: (refreshToken) =>
			OIDC.core.client.refreshTokenGrant(OIDC.core.configuration, refreshToken),
		storeRefreshToken: (refreshToken) =>
			event.cookies.set(makeCookieNames().refreshToken, refreshToken, sessionCookieOptions())
	});
}
