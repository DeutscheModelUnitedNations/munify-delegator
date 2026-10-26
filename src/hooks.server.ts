import { isRedirect, redirect, type Cookies } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';
import { sentryDataCollection } from '#lib/sentryDataCollection.js';
import { sequence, type Handle } from '@sveltejs/kit/hooks';

import {
	AUTHENTICATED_ROUTES,
	OIDC,
	isPublicRoute,
	accessTokenCookieName,
	refreshTokenCookieName
} from '#api/services/OIDC.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { localeOfRequest, runWithLocale } from '#api/services/requestLocale.js';
import { building } from '$app/env';
import { NODE_ENV, SENTRY_DSN, SENTRY_SEND_DEFAULT_PII } from '$app/env/private';
import {
	PUBLIC_FONTAWESOME_CSS_URL,
	PUBLIC_FONTAWESOME_SHARP_DUOTONE_CSS_URL,
	PUBLIC_OIDC_MIGRATION_NOTICE
} from '$app/env/public';
// --- TEMPORARY: Migration notice imports (remove after migration period) ---
import { MIGRATION_NOTICE_COOKIE, MIGRATION_NOTICE_VERSION } from '#lib/data/migrationNotice.js';
// --- END TEMPORARY ---

// Initialize Sentry (only if DSN provided and not building)
if (!building && SENTRY_DSN) {
	Sentry.init({
		dsn: SENTRY_DSN,
		environment: NODE_ENV,
		tracesSampleRate: 0, // Bugsink doesn't support tracing
		dataCollection: sentryDataCollection(SENTRY_SEND_DEFAULT_PII ?? false)
	});
}

// creating a handle to use the paraglide middleware
const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		const render = () =>
			resolve(event, {
				transformPageChunk: ({ html }) => {
					return html
						.replace('%lang%', locale)
						.replace(
							'%fontawesome.stylesheet%',
							`<link rel="stylesheet" href="${PUBLIC_FONTAWESOME_CSS_URL}" />` +
								`<link rel="stylesheet" href="${PUBLIC_FONTAWESOME_SHARP_DUOTONE_CSS_URL}" />`
						);
				}
			});

		// API calls carry no locale in their path; the client names its own in a header.
		const requested = localeOfRequest(localizedRequest);
		return requested && requested !== locale ? runWithLocale(requested, render) : render();
	});

// --- TEMPORARY: Migration notice handle (remove after migration period) ---
/** Whether a path leads to a page that needs a session. */
const isBehindLogin = (pathname: string) =>
	AUTHENTICATED_ROUTES.some((route) => pathname.startsWith(route)) && !isPublicRoute(pathname);

/** Whether the visitor has a session, or has read this version of the notice already. */
const knowsOfMigration = (cookies: Cookies) =>
	!!cookies.get(accessTokenCookieName) ||
	!!cookies.get(refreshTokenCookieName) ||
	cookies.get(MIGRATION_NOTICE_COOKIE) === MIGRATION_NOTICE_VERSION;

/**
 * Explains the identity provider change before the first login of the migration period.
 *
 * Has to run ahead of `OIDC.handle`, which is what would otherwise send a visitor without a
 * session straight to the provider. "Without a session" is read off the token cookies, since
 * `event.locals.oidc` is only populated by that later handle.
 */
const migrationNoticeHandle: Handle = ({ event, resolve }) => {
	if (
		PUBLIC_OIDC_MIGRATION_NOTICE &&
		isBehindLogin(event.url.pathname) &&
		!knowsOfMigration(event.cookies)
	) {
		const next = encodeURIComponent(event.url.pathname + event.url.search);
		redirect(302, `/auth/migration-notice?next=${next}`);
	}

	return resolve(event);
};
// --- END TEMPORARY ---

/**
 * The OIDC handle, except that a public page (see `isPublicRoute`) is served without a session
 * instead of redirecting to the provider. A visitor who is signed in still gets their session on
 * `event.locals.oidc`.
 */
const oidcHandle: Handle = async (input) => {
	if (!isPublicRoute(input.event.url.pathname)) {
		return OIDC.handle(input);
	}
	try {
		return await OIDC.handle(input);
	} catch (error) {
		if (isRedirect(error)) {
			return input.resolve(input.event);
		}
		throw error;
	}
};

export const handleError = Sentry.handleErrorWithSentry();
export const handle: Handle = sequence(
	Sentry.sentryHandle(),
	migrationNoticeHandle,
	// Protects the authenticated routes, serves both callback routes and puts the validated session
	// on `event.locals.oidc`. Everything auth-related used to be spread across route loads.
	oidcHandle,
	paraglideHandle
);
