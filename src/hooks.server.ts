import * as Sentry from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';

// Initialize Sentry (only if DSN provided and not building)
if (!building && env.SENTRY_DSN) {
	Sentry.init({
		dsn: env.SENTRY_DSN,
		environment: env.NODE_ENV,
		tracesSampleRate: 0, // Bugsink doesn't support tracing
		sendDefaultPii: true
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
