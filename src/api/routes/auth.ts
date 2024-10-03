import Elysia, { t } from 'elysia';
import { oidcPlugin } from '$api/auth/oidcPlugin';
import { getLogoutUrl } from '$api/auth/oidcFlow';

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
	});
