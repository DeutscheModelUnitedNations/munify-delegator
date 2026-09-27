import * as Sentry from '@sentry/sveltekit';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import {
	AUTHENTICATED_ROUTES,
	OIDC,
	accessTokenCookieName,
	refreshTokenCookieName
} from '$api/services/OIDC';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { building } from '$app/environment';
import { configPrivate } from '$config/private';
import { configPublic } from '$config/public';
// --- TEMPORARY: Migration notice imports (remove after migration period) ---
import { MIGRATION_NOTICE_COOKIE, MIGRATION_NOTICE_VERSION } from '$lib/data/migrationNotice';
// --- END TEMPORARY ---

// Initialize Sentry (only if DSN provided and not building)
if (!building && configPrivate.SENTRY_DSN) {
	Sentry.init({
		dsn: configPrivate.SENTRY_DSN,
		environment: configPrivate.NODE_ENV,
		tracesSampleRate: 0, // Bugsink doesn't support tracing
		sendDefaultPii: configPrivate.SENTRY_SEND_DEFAULT_PII ?? false
	});
}

// creating a handle to use the paraglide middleware
const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) => {
				return html.replace('%lang%', locale);
			}
		});
	});

// --- TEMPORARY: Migration notice handle (remove after migration period) ---
/**
 * Explains the identity provider change before the first login of the migration period.
 *
 * Has to run ahead of `OIDC.handle`, which is what would otherwise send a visitor without a
 * session straight to the provider. "Without a session" is read off the token cookies, since
 * `event.locals.oidc` is only populated by that later handle.
 */
const migrationNoticeHandle: Handle = ({ event, resolve }) => {
	if (
		configPublic.PUBLIC_OIDC_MIGRATION_NOTICE &&
		AUTHENTICATED_ROUTES.some((route) => event.url.pathname.startsWith(route)) &&
		!event.cookies.get(accessTokenCookieName) &&
		!event.cookies.get(refreshTokenCookieName) &&
		event.cookies.get(MIGRATION_NOTICE_COOKIE) !== MIGRATION_NOTICE_VERSION
	) {
		const next = encodeURIComponent(event.url.pathname + event.url.search);
		redirect(302, `/auth/migration-notice?next=${next}`);
	}

	return resolve(event);
};
// --- END TEMPORARY ---

export const handleError = Sentry.handleErrorWithSentry();
export const handle: Handle = sequence(
	Sentry.sentryHandle(),
	migrationNoticeHandle,
	// Protects the authenticated routes, serves both callback routes and puts the validated session
	// on `event.locals.oidc`. Everything auth-related used to be spread across route loads.
	OIDC.handle,
	paraglideHandle
);
