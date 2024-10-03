import Elysia, { t, type Static } from 'elysia';
import { TokenSet } from 'openid-client';
import { refresh, tokensCookieName, validateTokens } from './oidcFlow';
import { Parameters } from '@sinclair/typebox';
import { dynamicPrivateConfig } from '$config/private';
import type { oidcRoles } from './abilities/abilities';
import { logger } from '$api/util/logger';

const TokenCookieSchema = t.Partial(
	t.Object({
		refresh_token: t.String(),
		access_token: t.String(),
		token_type: t.String(),
		id_token: t.String(),
		scope: t.String(),
		expires_at: t.Number(),
		session_state: t.String()
	})
);

export type TokenCookieSchemaType = Static<typeof TokenCookieSchema>;

export const oidcPlugin = new Elysia({ name: 'oidc' })
	.use(logger)
	.guard({
		cookie: t.Cookie(
			{
				[tokensCookieName]: t.Optional(TokenCookieSchema)
			},
			{
				httpOnly: true,
				secure: true,
				additionalProperties: false
			}
		)
	})
	.derive({ as: 'global' }, async ({ cookie, requestId }) => {
		cookie[tokensCookieName].httpOnly = true;
		cookie[tokensCookieName].secure = true;
		cookie[tokensCookieName].sameSite = 'strict';

		if (!cookie[tokensCookieName].value) {
			return { oidc: { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined } };
		}
		const parsedCookie: TokenCookieSchemaType = JSON.parse(cookie[tokensCookieName].value);
		let tokenSet = new TokenSet(parsedCookie);
		if (tokenSet.expired() && parsedCookie.refresh_token) {
			try {
				tokenSet = await refresh(parsedCookie.refresh_token);
				const cookieValue: TokenCookieSchemaType = {
					access_token: tokenSet.access_token,
					expires_at: tokenSet.expires_at,
					id_token: tokenSet.id_token,
					refresh_token: tokenSet.refresh_token,
					scope: tokenSet.scope,
					session_state: tokenSet.session_state,
					token_type: tokenSet.token_type
				};
				cookie[tokensCookieName].value = JSON.stringify(cookieValue);
			} catch (error) {
				console.warn(`[${requestId}]: Failed to refresh tokens`, error);
			}
		}

		cookie[tokensCookieName].expires = tokenSet.expires_at
			? new Date(tokenSet.expires_at * 1000)
			: undefined;

		let user: Awaited<ReturnType<typeof validateTokens>> | undefined = undefined;
		if (tokenSet.access_token) {
			try {
				user = await validateTokens({
					access_token: tokenSet.access_token,
					id_token: tokenSet.id_token
				});
			} catch (error) {
				console.warn(`[${requestId}]: Failed to retrieve user info from tokens`, error);
			}
		}

		const systemRoleNames: (typeof oidcRoles)[number][] = [];

		if (user) {
			const rolesRaw = user[dynamicPrivateConfig.OIDC.ROLE_CLAIM]!;
			if (rolesRaw) {
				const roleNames = Object.keys(rolesRaw);
				systemRoleNames.push(...(roleNames as any));
			}
		}

		const hasRole = (role: (typeof systemRoleNames)[number]) => {
			return systemRoleNames.includes(role);
		};

		return {
			oidc: {
				nextTokenRefreshDue: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined,
				tokenSet,
				user: user ? { ...user, hasRole, systemRoleNames } : undefined
			}
		};
	});

export type OIDCDeriveType = Parameters<Parameters<(typeof oidcPlugin)['derive']>[1]>[0]['oidc'];
