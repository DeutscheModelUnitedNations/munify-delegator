import * as Sentry from '@sentry/sveltekit';
import { building } from '$app/environment';
import { configPublic } from '$config/public';

if (!building && configPublic.PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: configPublic.PUBLIC_SENTRY_DSN,
		environment: import.meta.env.MODE,
		tracesSampleRate: 0, // Bugsink doesn't support tracing
		sendDefaultPii: configPublic.PUBLIC_SENTRY_SEND_DEFAULT_PII ?? false
	});
}

export const handleError = Sentry.handleErrorWithSentry();
