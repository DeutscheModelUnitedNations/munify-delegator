import type * as Sentry from '@sentry/sveltekit';

type DataCollection = NonNullable<Parameters<typeof Sentry.init>[0]>['dataCollection'];

/**
 * Sentry's `dataCollection` for the `*_SENTRY_SEND_DEFAULT_PII` setting.
 *
 * Sentry 11 replaced the `sendDefaultPii` switch with per-category settings whose defaults collect
 * everything. With the setting off (the default here) nothing that identifies a person or carries
 * their input is sent: no user, cookies, query strings or request bodies, no GraphQL variables or
 * database values, no local variables from stack frames. Turned on, the SDK's defaults apply.
 */
export function sentryDataCollection(sendDefaultPii: boolean): DataCollection {
	if (sendDefaultPii) return {};
	return {
		userInfo: false,
		cookies: false,
		httpHeaders: false,
		httpBodies: [],
		urlQueryParams: false,
		graphQL: { document: true, variables: false },
		genAI: { inputs: false, outputs: false },
		databaseQueryData: false,
		queues: false,
		stackFrameVariables: false
	};
}
