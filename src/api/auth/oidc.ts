import Elysia, { t } from 'elysia';
import { TokenSet } from 'openid-client';
import { refresh, tokensCookieName, validateTokens } from './flow';
import { Parameters, type Static } from '@sinclair/typebox';
import { dynamicPrivateConfig } from '$config/private';
import type { oidcRoles } from './abilities/abilities';

export type TokenCookieSchemaType = {
	refresh_token?: string;
	access_token?: string;
	token_type?: string;
	id_token?: string;
	scope?: string;
	expires_at?: number;
	session_state?: string;
};

export const oidcPlugin = new Elysia({ name: 'oidc' }).derive(
	{ as: 'global' },
	async ({ cookie }) => {
		if (!cookie[tokensCookieName].value) {
			return { oidc: { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined } };
		}
		const parsedCookie: TokenCookieSchemaType = JSON.parse(cookie[tokensCookieName].value);
		let tokenSet = new TokenSet(parsedCookie);
		if (tokenSet.expired() && parsedCookie.refresh_token) {
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
		}
		let user: Awaited<ReturnType<typeof validateTokens>> | undefined = undefined;
		if (tokenSet.access_token) {
			try {
				user = await validateTokens({
					access_token: tokenSet.access_token,
					id_token: tokenSet.id_token
				});
			} catch (error) {
				console.warn('Failed to retrieve user info from tokens', error);
			}
		}

		const hasRole = (role: (typeof oidcRoles)[number]) => {
			if (!user) {
				return false;
			}
			const rolesRaw = user[dynamicPrivateConfig.OIDC.ROLE_CLAIM]!;
			if (!rolesRaw) {
				console.warn(
					'No roles claim in user info. Make sure you have the ROLE_CLAIM configured correctly',
					user
				);
			}
			const roleNames = Object.keys(rolesRaw);
			return roleNames.includes(role);
		};

		return {
			oidc: {
				nextTokenRefreshDue: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined,
				tokenSet,
				user: user ? { ...user, hasRole } : undefined
			}
		};
	}
);

export type OIDCDeriveType = Parameters<Parameters<(typeof oidcPlugin)['derive']>[1]>[0]['oidc'];
