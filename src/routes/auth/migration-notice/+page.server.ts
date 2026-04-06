// --- TEMPORARY: Migration notice route (remove after migration period) ---
import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { codeVerifierCookieName, oidcStateCookieName, startSignin } from '$api/services/OIDC';
import { MIGRATION_NOTICE_VERSION, MIGRATION_NOTICE_COOKIE } from '$lib/constants/migrationNotice';

function isSafeRedirectPath(path: string): boolean {
	return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const next = formData.get('next')?.toString() || '/';
		const safePath = isSafeRedirectPath(next) ? next : '/';
		const dismiss = formData.get('dismiss') === 'true';

		// Only set acknowledgment cookie if user opted to not see it again
		if (dismiss) {
			event.cookies.set(MIGRATION_NOTICE_COOKIE, MIGRATION_NOTICE_VERSION, {
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30,
				path: '/',
				secure: true,
				httpOnly: true
			});
		}

		// Build the target URL and start OIDC flow
		const targetUrl = new URL(safePath, event.url.origin);
		const { encrypted_state, encrypted_verifier, redirect_uri } = await startSignin(targetUrl);

		event.cookies.set(codeVerifierCookieName, encrypted_verifier, {
			sameSite: 'lax',
			maxAge: 60 * 5,
			path: '/',
			secure: true,
			httpOnly: true
		});

		event.cookies.set(oidcStateCookieName, encrypted_state, {
			sameSite: 'lax',
			maxAge: 60 * 5,
			path: '/',
			secure: true,
			httpOnly: true
		});

		throw redirect(302, redirect_uri);
	}
};
// --- END TEMPORARY ---
