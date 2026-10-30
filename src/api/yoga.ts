import { useGraphQLSSE } from '@graphql-yoga/plugin-graphql-sse';
import { createYoga } from '#api/rumble.js';
import { dev } from '$app/env';
import { GRAPHQL_STREAM_ENDPOINT } from '#lib/api/streamEndpoint.js';

import '#api/handlers/register.js';

/**
 * The one yoga instance, shared by `/api/graphql`, `/api/graphql/stream` and the SSR remote function.
 *
 * It has to be one instance: the SSE plugin keeps each browser's stream reservation in memory, so
 * the request that reserves a stream, the one that holds it open and the ones that start
 * subscriptions on it must all reach the same handler. That also means several app processes
 * need sticky sessions for the stream routes; events themselves still fan out through Redis.
 *
 * Subscriptions ride on one stream per tab (graphql-sse's single connection mode) rather than one
 * HTTP response per subscription. Over HTTP/1.1 a browser allows six connections per host, and a
 * page with six live queries would otherwise hold all of them, leaving mutations, further
 * subscriptions and lazily imported chunks queued forever.
 */
export const yoga = createYoga({
	graphqlEndpoint: '/api/graphql',
	maskedErrors: !dev,
	plugins: [useGraphQLSSE({ endpoint: GRAPHQL_STREAM_ENDPOINT })],
	// No `cors` option: rumble (≥ 0.26.3) defaults it to `false`, so the API sends no CORS headers
	// and stays same-origin. Never set it to yoga's default, which reflects any `Origin` with
	// `Access-Control-Allow-Credentials: true` and lets every website run queries and mutations
	// with a visitor's session cookies.
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
		crypto,
		btoa,
		TextEncoder,
		TextDecoder,
		URLPattern,
		URL,
		URLSearchParams
	}
});
