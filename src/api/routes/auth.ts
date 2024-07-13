import Elysia, { t } from 'elysia';
import { refresh, tokensCookieName } from '$lib/auth/oidc';

const AuthCookieSchema = t.Object(
	{
		[tokensCookieName]: t.Object({
			refresh_token: t.String(),
			access_token: t.String(),
			token_type: t.String(),
			id_token: t.String(),
			scope: t.String(),
			expires_at: t.Number(),
			session_state: t.String()
		})
	},
	{ additionalProperties: true }
);

export const auth = new Elysia().get(
	'/refresh-token',
	async ({ cookie, error }) => {
		const authCookie = cookie[tokensCookieName].value;
		if (authCookie.expires_at < Date.now()) {
			throw error('Not Modified', 'Token is not expired');
		}

		const refreshed = await refresh(authCookie.refresh_token);
		cookie[tokensCookieName].set(refreshed as any);

		return { nextRefreshDue: refreshed.expires_at ? new Date(refreshed.expires_at) : undefined };
	},
	{
		cookie: AuthCookieSchema,
		response: t.Object({
			nextRefreshDue: t.MaybeEmpty(t.Date())
		})
	}
);
