import * as Sentry from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { building } from '$app/environment';
import { configPrivate } from '$config/private';
import { configPublic } from '$config/public';

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
				return html
					.replace('%lang%', locale)
					.replaceAll('%fontawesome.baseUrl%', configPublic.PUBLIC_FONTAWESOME_CSS_BASE_URL);
			},
			// Houdini's fetch plugin reads the content-type header from responses
			// fetched during SSR load; SvelteKit only serializes headers that pass
			// this filter, so it must be explicitly allowed through.
			filterSerializedResponseHeaders: (name) => name === 'content-type'
		});
	});

export const handleError = Sentry.handleErrorWithSentry();
export const handle: Handle = sequence(Sentry.sentryHandle(), paraglideHandle);
