import { nativeDateExchange } from '@m1212e/rumble/client';
import { type AnyVariables, Client, CombinedError, type Exchange, fetchExchange } from '@urql/core';
import { cacheExchange } from '@urql/exchange-graphcache';
import { filter, fromPromise, merge, mergeMap, pipe } from 'wonka';
import { browser } from '$app/env';
import { graphqlOperation } from '#api/graphql.remote';
import { schema } from './rumbleClient/schema';
import { getLocale } from '#lib/paraglide/runtime';
import { LOCALE_HEADER } from './localeHeader';
import { graphcacheKeys } from './cacheKeys';
import { liveQueryUpdates, staleQueryInvalidations } from './cacheUpdates';
import { loginRedirectExchange } from './loginRedirect';

/** `AnyVariables` includes `void` for operations that take none; the remote call wants a record. */
function toVariables(variables: AnyVariables): Record<string, unknown> | undefined {
	return variables && typeof variables === 'object' ? variables : undefined;
}

/**
 * Runs an operation through the SSR remote function instead of over HTTP.
 *
 * Only reachable on the server, where the client's relative endpoint URL cannot be fetched.
 * Subscriptions are not handled here and anything this exchange does not answer falls through to
 * `fetchExchange`.
 */
const ssrExchange: Exchange = ({ forward }) => {
	return (operations) => {
		const handled = pipe(
			operations,
			filter((operation) => !browser && operation.kind !== 'teardown'),
			mergeMap((operation) => {
				const run = graphqlOperation({
					query: operation.query,
					variables: toVariables(operation.variables)
				});

				return fromPromise(
					run.then((result) => ({
						operation,
						data: result.data ?? undefined,
						error: result.errors?.length
							? new CombinedError({ graphQLErrors: [...result.errors] })
							: undefined,
						stale: false,
						hasNext: false
					}))
				);
			})
		);

		const forwarded = pipe(
			operations,
			filter((operation) => browser || operation.kind === 'teardown'),
			forward
		);

		return merge([handled, forwarded]);
	};
};

/**
 * The urql client the generated rumble client wraps.
 *
 * Still smaller than chase's: no offline/local-demo mode and no crosstab sync. Subscriptions go
 * over server-sent events rather than chase's WebSocket transport - that one needs a custom
 * `server.js`, a dev-server upgrade hook and synthetic request events, none of which this app has.
 * `fetchSubscriptions` is what makes `liveQuery` actually live: `fetchExchange` sends each
 * subscription to `/api/graphql` and yoga answers it with its built-in server-sent events, one
 * response per subscription.
 *
 * Each subscription holds a connection. Over HTTP/1.1 a browser allows six per host, so a page with
 * six live queries would queue every later request; production is served over HTTP/2 (the proxy
 * terminates TLS), which multiplexes them over one connection.
 */
export const urqlClient = new Client({
	url: '/api/graphql',
	// The normalizing cache has to be in place on both sides: the generated client represents
	// nested fields as functions, and this is what turns a response into plain data.
	exchanges: [
		nativeDateExchange,
		loginRedirectExchange,
		// Not schema-aware on purpose: with the schema, graphcache answers a query that asks for a
		// nullable field it has not seen on a cached entity at once, with that field as null (a
		// "partial" result). A one-shot `client.query` resolves with that answer and drops the refetch
		// - a certificate's template or a person's address came back as "none" to anyone whose
		// dashboard had cached the row. Without it, an unseen field is a miss and is asked for. The
		// schema has no unions or interfaces and the client sends no fragments, so nothing else needs it.
		cacheExchange({
			keys: graphcacheKeys(schema),
			updates: { ...liveQueryUpdates(schema), Mutation: staleQueryInvalidations }
		}),
		ssrExchange,
		fetchExchange
	],
	// subscriptions over yoga's built-in server-sent events, see above
	fetchSubscriptions: true,
	// The API builds messages (errors, mails) in the locale of whoever asked; the path of
	// `/api/graphql` does not say which that is, so the request does.
	fetchOptions: () => ({
		credentials: 'include',
		headers: { [LOCALE_HEADER]: getLocale() }
	}),
	// In the browser: cached data renders immediately while the network answer refreshes it. The
	// default, `cache-first`, would hand back a stale entity forever once it had been read once.
	//
	// On the server: never answer from the cache. This client is a module-level singleton, so the
	// cache is shared by every request the process handles, and reading from it hands one visitor's
	// data to the next. `myOIDCRoles` was the sharp edge - same document, no variables - so whoever
	// warmed the cache decided what everybody else was allowed to see.
	requestPolicy: browser ? 'cache-and-network' : 'network-only'
});
