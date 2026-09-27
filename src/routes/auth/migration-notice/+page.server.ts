// --- TEMPORARY: Migration notice route (remove after migration period) ---
import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { MIGRATION_NOTICE_VERSION, MIGRATION_NOTICE_COOKIE } from '$lib/data/migrationNotice';

function isSafeRedirectPath(path: string): boolean {
	return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const next = formData.get('next')?.toString() || '/';
		const safePath = isSafeRedirectPath(next) ? next : '/';
		const dismiss = formData.get('dismiss') === 'true';

		// The acknowledgement is always recorded, because the handle that shows this page keys off
		// it: without it, sending someone back to the page they wanted would bounce them straight
		// back here. Ticking "don't show again" makes it outlive the browser session, otherwise it
		// only suppresses the notice until the browser is closed.
		event.cookies.set(MIGRATION_NOTICE_COOKIE, MIGRATION_NOTICE_VERSION, {
			sameSite: 'lax',
			maxAge: dismiss ? 60 * 60 * 24 * 30 : undefined,
			path: '/',
			secure: true,
			httpOnly: true
		});

		// Going back to the page they wanted is what starts the login: it is behind the OIDC
		// handle's protected routes, which is what sent them here in the first place.
		redirect(302, safePath);
	}
};
// --- END TEMPORARY ---
