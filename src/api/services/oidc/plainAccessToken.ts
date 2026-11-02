import type { SessionTokens } from '@m1212e/sveltekit-oidc';

/**
 * The signed-in person's access token as the token exchange (RFC 8693) accepts it for
 * `actor_token`. Logto takes only an opaque access token carrying the `openid` scope there (its
 * token exchange grant looks the token up by value and checks that scope), which is what a sign-in
 * without a resource issues. With `OIDC_RESOURCE` the session's access token is a JWT for that
 * resource, holding the resource's scopes only, so the session's refresh token is traded for a
 * token set *without* a resource, whose access token is the plain one. The provider may rotate the
 * refresh token in that grant; the new one goes to `storeRefreshToken`, or the session would end
 * once its own access token expires. Pure, for its tests: the grant and the cookie write come in.
 */
export async function plainAccessToken({
	tokens,
	resourceConfigured,
	refreshWithoutResource,
	storeRefreshToken
}: {
	tokens: SessionTokens;
	resourceConfigured: boolean;
	refreshWithoutResource: (
		refreshToken: string
	) => Promise<{ access_token: string; refresh_token?: string }>;
	storeRefreshToken: (refreshToken: string) => void;
}): Promise<string> {
	if (!resourceConfigured) {
		if (!tokens.accessToken) throw new Error('the session holds no access token');
		return tokens.accessToken;
	}
	if (!tokens.refreshToken) {
		throw new Error(
			'the session holds no refresh token to fetch a plain access token with (OIDC_SCOPES needs offline_access)'
		);
	}
	const refreshed = await refreshWithoutResource(tokens.refreshToken);
	if (refreshed.refresh_token && refreshed.refresh_token !== tokens.refreshToken) {
		storeRefreshToken(refreshed.refresh_token);
	}
	return refreshed.access_token;
}
