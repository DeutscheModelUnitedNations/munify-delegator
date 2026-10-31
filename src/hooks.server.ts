import * as Sentry from '@sentry/sveltekit';
import { sentryDataCollection } from '#lib/sentryDataCollection';
import { graphqlLogger, logger } from '#lib/logger';
import { sequence, type Handle } from '@sveltejs/kit/hooks';

import { OIDC, oidcHandle, userInfoHandle } from '#api/services/oidc/OIDC';
import { paraglideMiddleware } from '#lib/paraglide/server';
import { impersonationHandle } from '#api/handlers/user/userPermissions';
import { localeOfRequest, runWithLocale } from '#api/services/requestLocale';
import { building } from '$app/env';
import { NODE_ENV, SENTRY_DSN, SENTRY_SEND_DEFAULT_PII } from '$app/env/private';
import {
	PUBLIC_FONTAWESOME_CSS_URL,
	PUBLIC_FONTAWESOME_SHARP_DUOTONE_CSS_URL
} from '$app/env/public';

// Initialize Sentry (only if DSN provided and not building)
if (!building && SENTRY_DSN) {
	Sentry.init({
		dsn: SENTRY_DSN,
		environment: NODE_ENV,
		tracesSampleRate: 0, // Bugsink doesn't support tracing
		dataCollection: sentryDataCollection(SENTRY_SEND_DEFAULT_PII ?? false),
		// Every `logger.error` becomes an issue; Bugsink takes no logs, so nothing else is sent.
		integrations: [Sentry.pinoIntegration({ error: { levels: ['error'] }, log: { levels: [] } })]
	});
	Sentry.pinoIntegration.untrackLogger(graphqlLogger);
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
		return requested && requested !== locale
			? runWithLocale({ locale: requested, fn: render })
			: render();
	});

export const handleError = Sentry.handleErrorWithSentry();
export const handle: Handle = sequence(
	Sentry.sentryHandle(),
	// Protects the authenticated routes, serves both callback routes and puts the validated session
	// on `event.locals.oidc`. Everything auth-related used to be spread across route loads.
	oidcHandle,
	userInfoHandle,
	impersonationHandle,
	paraglideHandle
);
