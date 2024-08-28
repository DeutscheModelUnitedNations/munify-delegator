import Elysia, { t } from 'elysia';
import { oidcPlugin } from '$api/auth/oidc';

export const auth = new Elysia()
	.use(oidcPlugin)
	// the refresh is done automatically by the oidc derive
	.get('/refresh-token', ({ oidc }) => ({ nextTokenRefreshDue: oidc.nextTokenRefreshDue }), {
		response: t.Object({
			nextTokenRefreshDue: t.Optional(t.Date())
		})
	});
