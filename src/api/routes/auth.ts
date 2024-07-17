import Elysia, { t } from 'elysia';
import { oidcPlugin } from '$api/auth/oidc';

export const auth = new Elysia()
	.use(oidcPlugin)
	// the refresh is done automatically by the oidc derive
	.get('/refresh-token', ({ oidc }) => ({ nextRefreshDue: oidc.nextRefreshDue }), {
		response: t.Object({
			nextRefreshDue: t.Optional(t.Date())
		})
	});
