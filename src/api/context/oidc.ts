import { z } from 'zod/v4';
import { oidcRoles, refresh, validateTokens } from '$api/services/OIDC';
import { configPrivate } from '$config/private';
import type { RequestEvent } from '@sveltejs/kit';
import { GraphQLError } from 'graphql';

const TokenCookieSchema = z
	.object({
		refresh_token: z.string(),
		access_token: z.string(),
		token_type: z.string(),
		id_token: z.string(),
		scope: z.string(),
		expires_in: z.number(),
		session_state: z.any()
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
		console.error('Failed to parse token set', tokenSetRaw.error);
		return { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined };
	}

	const tokenSet = tokenSetRaw.data;

	if (!tokenSet.access_token) {
		console.error('Incoming token set did not provide an access token!');
		return { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined };
	}

	let user: Awaited<ReturnType<typeof validateTokens>> | undefined = undefined;

	try {
		user = await validateTokens({
			access_token: tokenSet.access_token,
			id_token: tokenSet.id_token
		});
	} catch (error) {
		console.warn(`Failed to retrieve user info from tokens`, error);
	}

	if (!user) {
		try {
			if (!tokenSet.refresh_token) throw new GraphQLError('No refresh token available');
			const refreshed = await refresh(tokenSet.refresh_token);
			const cookieValue: TokenCookieSchemaType = {
				access_token: refreshed.access_token,
				expires_in: refreshed.expires_in,
				id_token: refreshed.id_token,
				refresh_token: refreshed.refresh_token,
				scope: refreshed.scope,
				session_state: refreshed.session_state,
				token_type: refreshed.token_type
			};

			cookies.set(tokensCookieName, JSON.stringify(cookieValue), {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: tokenSet.expires_in ? tokenSet.expires_in : undefined
			});
		} catch (error) {
			console.warn(`Failed to refresh tokens`, error);
			return { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined };
		}
	}

	const OIDCRoleNames: (typeof oidcRoles)[number][] = [];

	if (user && configPrivate.OIDC_ROLE_CLAIM) {
		const rolesRaw = user[configPrivate.OIDC_ROLE_CLAIM]!;
		if (rolesRaw) {
			const roleNames = Object.keys(rolesRaw);
			OIDCRoleNames.push(...(roleNames as any));
		}
	}

	const hasRole = (role: (typeof OIDCRoleNames)[number]) => {
		return OIDCRoleNames.includes(role);
	};

	return {
		nextTokenRefreshDue: tokenSet.expires_in
			? new Date(Date.now() + tokenSet.expires_in * 1000)
			: undefined,
		tokenSet,
		user: user ? { ...user, hasRole, OIDCRoleNames } : undefined
	};
}

export type OIDC = Awaited<ReturnType<typeof oidc>>;
