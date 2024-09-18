import Elysia, { t } from 'elysia';
import { oidcPlugin } from '$api/auth/oidc';
import { getLogoutUrl } from '$api/auth/flow';

export const auth = new Elysia()
	.use(oidcPlugin)
	// the refresh is done automatically by the oidc derive
	.get('/auth/refresh-token', ({ oidc }) => ({ nextTokenRefreshDue: oidc.nextTokenRefreshDue }), {
		response: t.Object({
			nextTokenRefreshDue: t.Optional(t.Date())
		})
	})
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
