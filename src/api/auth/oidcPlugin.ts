import Elysia from 'elysia';
import { TokenSet } from 'openid-client';
import { refresh, tokensCookieName, validateTokens } from './flow';
import { Parameters } from '@sinclair/typebox';
import { dynamicPrivateConfig } from '$config/private';
import type { oidcRoles } from './abilities/abilities';
import { UserFacingError } from '$api/util/logger';

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
	async ({ cookie, headers }) => {
		let rawTokenValue: TokenCookieSchemaType | undefined = undefined;

		if (cookie[tokensCookieName].value) {
			rawTokenValue = JSON.parse(cookie[tokensCookieName].value);
		} else if (headers['authorization']) {
			if (!headers['authorization'].startsWith('Bearer ')) {
				throw new UserFacingError('Invalid authorization header', 'Bad Request');
			}

			let headerValue: any = headers['authorization'].split(' ')[1];

			// is this base64 encoded?
			try {
				headerValue = atob(headerValue);
			} catch (error) {}

			// is this JSON encoded?
			try {
				// if it is, treat it as tokenset
				rawTokenValue = JSON.parse(headerValue);
			} catch (error) {
				// if not, this might be the access token
				rawTokenValue = { access_token: headerValue };
			}
		}

		if (!rawTokenValue) {
			return { oidc: { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined } };
		}
		let tokenSet = new TokenSet(rawTokenValue);
		if (tokenSet.expired() && rawTokenValue.refresh_token) {
			tokenSet = await refresh(rawTokenValue.refresh_token);
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
	}
);

export type OIDCDeriveType = Parameters<Parameters<(typeof oidcPlugin)['derive']>[1]>[0]['oidc'];
