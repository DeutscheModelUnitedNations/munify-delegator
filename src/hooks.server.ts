// Initialize OpenTelemetry tracing FIRST - before any other imports that make HTTP connections
// This ensures HttpInstrumentation can properly patch the http modules
import '$api/resolvers/tracer';

import * as Sentry from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { building } from '$app/environment';
import { configPrivate } from '$config/private';

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

export const handleError = Sentry.handleErrorWithSentry();
export const handle: Handle = sequence(Sentry.sentryHandle(), paraglideHandle);
