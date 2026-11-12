import { createYoga } from '#api/rumble';
import { dev } from '$app/env';
import { databaseRuleError } from '#api/services/errors';

import '#api/handlers/register';

/**
 * The one yoga instance, shared by `/api/graphql` and the SSR remote function.
 *
 * Subscriptions use yoga's built-in server-sent events on `/api/graphql`: each subscription is one
 * response streaming its results (graphql-sse's distinct connections mode), so any app process can
 * serve it and events fan out through Redis. Each one holds a connection, which over HTTP/1.1 counts
 * against the browser's six per host; production is served over HTTP/2, which multiplexes them.
 */
export const yoga = createYoga({
	graphqlEndpoint: '/api/graphql',
	maskedErrors: !dev,
	// GraphQL Armor guards production only (development serves the API docs instead). Its default
	// depth of 6 refused the paper hub's papers by committee, which name each paper's nation seven
	// levels down.
	armorConfig: { maxDepth: { n: 7 } },
	plugins: [
		// Answers a write the database's triggers refused as the input error it is, before masking
		// would turn it into an unexpected one (yoga runs these plugins ahead of its masking).
		{
			onExecute: () => ({
				onExecuteDone: ({ result, setResult }) => {
					if (Symbol.asyncIterator in result || !result.errors) return;
					setResult({
						...result,
						errors: result.errors.map((error) => databaseRuleError(error) ?? error)
					});
				}
			})
		}
	],
	fetchAPI: {
		fetch,
		Request,
		Response,
		Headers,
		FormData,
		ReadableStream,
		WritableStream,
		TransformStream,
		Blob,
		btoa,
		TextEncoder,
		TextDecoder,
		URLPattern,
		URL,
		URLSearchParams
	}
});
