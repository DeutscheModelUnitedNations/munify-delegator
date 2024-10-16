import { z } from 'zod';
import { TokenSet } from 'openid-client';
import { oidcRoles, refresh, validateTokens } from '$api/services/OIDC';
import { configPrivate } from '$config/private';
import type { RequestEvent } from '@sveltejs/kit';

const TokenCookieSchema = z
	.object({
		refresh_token: z.string(),
		access_token: z.string(),
		token_type: z.string(),
		id_token: z.string(),
		scope: z.string(),
		expires_at: z.number(),
		expires_in: z.number(),
		session_state: z.string()
	})
	.partial();

export type TokenCookieSchemaType = z.infer<typeof TokenCookieSchema>;

export const tokensCookieName = 'token_set';

export async function oidc(cookies: RequestEvent['cookies']) {
	const cookie = cookies.get(tokensCookieName);
	if (!cookie) {
		return { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined };
	}
	const tokenSetRaw = await TokenCookieSchema.safeParse(JSON.parse(cookie));
	if (!tokenSetRaw.success) {
		
		return { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined };
	}
	let tokenSet = new TokenSet(tokenSetRaw);

	if (tokenSet.expired() && tokenSetRaw.data.refresh_token) {
		try {
			tokenSet = await refresh(tokenSetRaw.data.refresh_token);
			const cookieValue: TokenCookieSchemaType = {
				access_token: tokenSet.access_token,
				expires_at: tokenSet.expires_at,
				expires_in: tokenSet.expires_in,
				id_token: tokenSet.id_token,
				refresh_token: tokenSet.refresh_token,
				scope: tokenSet.scope,
				session_state: tokenSet.session_state,
				token_type: tokenSet.token_type
			};

			cookies.set(tokensCookieName, JSON.stringify(cookieValue), {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: tokenSet.expires_in ? tokenSet.expires_in : undefined,
				expires: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined
			});
		} catch (error) {
			console.warn(`Failed to refresh tokens`, error);
		}
	}


	let user: Awaited<ReturnType<typeof validateTokens>> | undefined = undefined;
	if (tokenSet.access_token) {
		try {
			user = await validateTokens({
				access_token: tokenSet.access_token,
				id_token: tokenSet.id_token
			});
		} catch (error) {
			console.warn(`Failed to retrieve user info from tokens`, error);
		}
	}

	const systemRoleNames: (typeof oidcRoles)[number][] = [];

	if (user) {
		const rolesRaw = user[configPrivate.OIDC_ROLE_CLAIM]!;
		if (rolesRaw) {
			const roleNames = Object.keys(rolesRaw);
			systemRoleNames.push(...(roleNames as any));
		}
	}

	const hasRole = (role: (typeof systemRoleNames)[number]) => {
		return systemRoleNames.includes(role);
	};

	return {
		nextTokenRefreshDue: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined,
		tokenSet,
		user: user ? { ...user, hasRole, systemRoleNames } : undefined
	};
}

export type OIDC = Awaited<ReturnType<typeof oidc>>;
