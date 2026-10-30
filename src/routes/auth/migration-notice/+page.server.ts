// --- TEMPORARY: Migration notice route (remove after migration period) ---
import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import {
	MIGRATION_NOTICE_VERSION,
	MIGRATION_NOTICE_COOKIE
} from '#api/services/migrationNotice.js';
import { sameSitePath } from '#api/services/sameSitePath.js';

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const safePath = sameSitePath(formData.get('next')?.toString(), event.url.origin);
		const dismiss = formData.get('dismiss') === 'true';

		// The acknowledgement is always recorded, because the handle that shows this page keys off
		// it: without it, sending someone back to the page they wanted would bounce them straight
		// back here. Ticking "don't show again" makes it outlive the browser session, otherwise it
		// only suppresses the notice until the browser is closed.
		event.cookies.set(MIGRATION_NOTICE_COOKIE, MIGRATION_NOTICE_VERSION, {
			sameSite: 'lax',
			maxAge: dismiss ? 60 * 60 * 24 * 30 : undefined,
			path: '/',
			secure: !dev,
			httpOnly: true
		});

		// Going back to the page they wanted is what starts the login: it is behind the OIDC
		// handle's protected routes, which is what sent them here in the first place.
		redirect(302, safePath);
	}
};
// --- END TEMPORARY ---
