import { nativeDateExchange } from '@m1212e/rumble/client';
import { type AnyVariables, Client, CombinedError, type Exchange, fetchExchange } from '@urql/core';
import { cacheExchange } from '@urql/exchange-graphcache';
import { filter, fromPromise, merge, mergeMap, pipe } from 'wonka';
import { browser } from '$app/environment';
import { graphqlOperation } from '$api/graphql.remote';
import { schema } from './rumbleClient/schema';

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
 * Still smaller than chase's: no offline/local-demo mode and no crosstab sync. Subscriptions ride
 * on the same HTTP endpoint as everything else, over server-sent events, rather than on chase's
 * WebSocket transport - that one needs a custom `server.js`, a dev-server upgrade hook and
 * synthetic request events, none of which this app has. `fetchSubscriptions` is what the generated
 * client configures for itself, and it is what makes `liveQuery` actually live.
 */
export const urqlClient = new Client({
	url: '/api/graphql',
	// The normalizing cache has to be in place on both sides: the generated client represents
	// nested fields as functions, and this is what turns a response into plain data.
	exchanges: [nativeDateExchange, cacheExchange({ schema }), ssrExchange, fetchExchange],
	fetchSubscriptions: true,
	fetchOptions: {
		credentials: 'include'
	},
	// In the browser: cached data renders immediately while the network answer refreshes it. The
	// default, `cache-first`, would hand back a stale entity forever once it had been read once.
	//
	// On the server: never answer from the cache. This client is a module-level singleton, so the
	// cache is shared by every request the process handles, and reading from it hands one visitor's
	// data to the next. `myOIDCRoles` was the sharp edge - same document, no variables - so whoever
	// warmed the cache decided what everybody else was allowed to see.
	requestPolicy: browser ? 'cache-and-network' : 'network-only'
});
