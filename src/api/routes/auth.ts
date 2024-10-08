import Elysia, { t } from 'elysia';
import { oidcPlugin } from '$api/auth/oidcPlugin';
import { fetchUserInfoFromIssuer, getLogoutUrl } from '$api/auth/oidcFlow';
import { UserFacingError } from '$api/util/logger';
import { db } from '$db/db';

export const auth = new Elysia()
	.use(oidcPlugin)
	// the refresh is done automatically by the oidc derive
	.get(
		'/auth/refresh-user',
		({ oidc }) => ({ nextTokenRefreshDue: oidc.nextTokenRefreshDue, user: oidc.user }),
		{
			response: t.Object({
				nextTokenRefreshDue: t.Optional(t.Date()),
				user: t.Optional(
					t.Composite([
						t.Partial(
							t.Object({
								email: t.String(),
								preferred_username: t.String(),
								family_name: t.String(),
								given_name: t.String()
							})
						),
						t.Object({
							sub: t.String()
						})
					])
				)
			})
		}
	)
	.get(
		'/auth/my-system-roles',
		({ oidc }) => ({ mySystemRoles: oidc.user?.systemRoleNames ?? [] }),
		{
			response: t.Object({
				mySystemRoles: t.Array(
					t.Union([t.Literal('admin'), t.Literal('member'), t.Literal('service_user')])
				)
			})
		}
	)
	.get('/auth/logout-url', ({ request }) => ({ logoutUrl: getLogoutUrl(new URL(request.url)) }), {
		response: t.Object({
			logoutUrl: t.String()
		})
	})
	.post('/auth/trigger-user-data-refresh', async ({ oidc }) => {
		if (!oidc.tokenSet?.access_token) {
			throw new UserFacingError('No access token provided');
		}
		const issuerUserData = await fetchUserInfoFromIssuer(oidc.tokenSet?.access_token);

		await db.user.update({
			where: {
				id: issuerUserData.sub
			},
			data: {
				email: issuerUserData.email ?? undefined,
				family_name: issuerUserData.family_name ?? undefined,
				given_name: issuerUserData.given_name ?? undefined,
				preferred_username: issuerUserData.preferred_username ?? undefined,
				locale: issuerUserData.locale ?? undefined,
				phone: (issuerUserData.phone as string) ?? undefined
			}
		});
	});
