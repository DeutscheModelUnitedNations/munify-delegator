import Elysia, { t } from 'elysia';
import { TokenSet } from 'openid-client';
import { refresh, tokensCookieName, userInfo } from './flow';
import { Parameters } from '@sinclair/typebox';

export const oidcPlugin = new Elysia({ name: 'oidc' })
	.guard({
		cookie: t.Optional(
			t.Partial(
				t.Object(
					{
						[tokensCookieName]: t.Optional(
							t.Partial(
								t.Object(
									{
										refresh_token: t.String(),
										access_token: t.String(),
										token_type: t.String(),
										id_token: t.String(),
										scope: t.String(),
										expires_at: t.Number(),
										session_state: t.String()
									},
									{ additionalProperties: true }
								)
							)
						)
					},
					{ additionalProperties: true }
				)
			)
		)
	})
	.derive({ as: 'global' }, async ({ cookie }) => {
		if (!cookie[tokensCookieName].value) {
			return { oidc: { nextRefreshDue: undefined, tokenSet: undefined, user: undefined } };
		}
		let tokenSet = new TokenSet(cookie[tokensCookieName].value);
		if (tokenSet.expired() && cookie[tokensCookieName].value.refresh_token) {
			tokenSet = await refresh(cookie[tokensCookieName].value.refresh_token);
			cookie[tokensCookieName].value = tokenSet;
		}
		let user: Awaited<ReturnType<typeof userInfo>> | undefined = undefined;
		if (tokenSet.access_token) {
			try {
				user = await userInfo(tokenSet.access_token);
			} catch (error) {
				console.warn('Failed to fetch user info', error);
			}
		}

		return {
			oidc: {
				nextRefreshDue: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined,
				tokenSet,
				user
			}
		};
	});

export type OIDCDeriveType = Parameters<Parameters<(typeof oidcPlugin)['derive']>[1]>[0]['oidc'];
