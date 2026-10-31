import * as Sentry from '@sentry/sveltekit';
import { sentryDataCollection } from '#lib/sentryDataCollection';
import { forwardErrors } from '#lib/logger';
import { building } from '$app/env';
import { PUBLIC_SENTRY_DSN, PUBLIC_SENTRY_SEND_DEFAULT_PII } from '$app/env/public';

if (!building && PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: PUBLIC_SENTRY_DSN,
		environment: import.meta.env.MODE,
		tracesSampleRate: 0, // Bugsink doesn't support tracing
		dataCollection: sentryDataCollection(PUBLIC_SENTRY_SEND_DEFAULT_PII ?? false)
	});

	// Every `logger.error` in the browser becomes an issue, as on the server.
	forwardErrors(({ message, error, fields }) => {
		const extra = { ...fields, logMessage: message };
		if (error) Sentry.captureException(error, { extra });
		else Sentry.captureMessage(message, { level: 'error', extra });
	});
}

export const handleError = Sentry.handleErrorWithSentry();
