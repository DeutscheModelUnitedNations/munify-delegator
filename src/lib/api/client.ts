import { nativeDateExchange } from '@m1212e/rumble/client';
import { Client, fetchExchange } from '@urql/core';
import { cacheExchange } from '@urql/exchange-graphcache';
import { schema } from './rumbleClient/schema';

/**
 * The urql client the generated rumble client wraps.
 *
 * Deliberately minimal compared with chase's: this app has no GraphQL subscriptions, no
 * offline/local-demo mode and no crosstab sync, so it needs neither `subscriptionExchange`
 * nor `offlineExchange` nor the SSR remote-functions exchange. Add them only against a
 * concrete requirement.
 */
export const urqlClient = new Client({
	url: '/api/graphql2',
	exchanges: [nativeDateExchange, cacheExchange({ schema }), fetchExchange]
});
