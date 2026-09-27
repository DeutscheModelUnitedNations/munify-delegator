import { nativeDateExchange } from '@m1212e/rumble/client';
import { type AnyVariables, Client, CombinedError, type Exchange, fetchExchange } from '@urql/core';
import { cacheExchange } from '@urql/exchange-graphcache';
import { filter, fromPromise, merge, mergeMap, pipe } from 'wonka';
import { browser } from '$app/environment';
import { performGraphQLOperation } from '$api/graphqlSSR';
import { schema } from './rumbleClient/schema';

/** `AnyVariables` includes `void` for operations that take none; the remote call wants a record. */
function toVariables(variables: AnyVariables): Record<string, unknown> | undefined {
	return variables && typeof variables === 'object' ? variables : undefined;
}

/**
 * Runs an operation against the schema in this process instead of over HTTP.
 *
 * Only reachable on the server, where the client's relative endpoint URL cannot be fetched.
 * Subscriptions are not handled here and anything this exchange does not answer falls through to
 * `fetchExchange`.
 */
const inProcessExchange: Exchange = ({ forward }) => {
	return (operations) => {
		const handled = pipe(
			operations,
			filter((operation) => !browser && operation.kind !== 'teardown'),
			mergeMap((operation) => {
				const run = performGraphQLOperation({
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
 * Deliberately minimal compared with chase's: this app has no GraphQL subscriptions, no
 * offline/local-demo mode and no crosstab sync, so it needs neither `subscriptionExchange` nor
 * `offlineExchange` nor crosstab sync. Add them only against a concrete requirement.
 */
export const urqlClient = new Client({
	url: '/api/graphql',
	exchanges: [nativeDateExchange, cacheExchange({ schema }), inProcessExchange, fetchExchange],
	fetchOptions: {
		credentials: 'include'
	}
});
