import * as Sentry from '@sentry/sveltekit';
import { building } from '$app/environment';
import { env } from '$env/dynamic/public';

if (!building && env.PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: env.PUBLIC_SENTRY_DSN,
		environment: import.meta.env.MODE,
		tracesSampleRate: 0, // Bugsink doesn't support tracing
		sendDefaultPii: env.PUBLIC_SENTRY_SEND_DEFAULT_PII === 'true'
	});
}

export const handleError = Sentry.handleErrorWithSentry();
