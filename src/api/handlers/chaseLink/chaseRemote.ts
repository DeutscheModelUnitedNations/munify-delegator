import { Client, fetchExchange, subscriptionExchange } from '@urql/core';
import { createClient as createWSClient } from 'graphql-ws';
import {
	makeLiveQuery,
	makeMutation,
	makeQuery,
	makeSubscription,
	nativeDateExchange
} from '@m1212e/rumble/client';
import { schema } from './chaseClient/schema';
import type { Mutation, Query, Subscription } from './chaseClient/client';
import { LINK_TOKEN_HEADER } from './linkTokens';

/** The subscriptions CHASE's schema offers, which a live query subscribes to by name. */
const availableSubscriptions = new Set(
	schema.__schema.types
		.filter((type) => type.name === schema.__schema.subscriptionType?.name)
		.flatMap((type) => ('fields' in type ? (type.fields ?? []).map((field) => field.name) : []))
);

/**
 * A typed client of a CHASE instance (`docs/plans/chase-link.md`), generated from its schema
 * (`bun run link:client`). Calls carry the link token when given one; subscriptions share one
 * WebSocket to CHASE's `/api/graphql`, which takes the token in its connection parameters. No
 * cache: the link worker reads current state.
 */
export function createChaseClient({
	url,
	token,
	onConnected
}: {
	url: string;
	token?: string;
	/** Every (re)connect of the WebSocket, when updates may have been missed. */
	onConnected?: () => void;
}) {
	const headers: Record<string, string> = token ? { [LINK_TOKEN_HEADER]: token } : {};
	const wsUrl = new URL('/api/graphql', url);
	wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
	// only connects once something subscribes
	const ws = createWSClient({
		url: wsUrl.toString(),
		connectionParams: headers,
		// keep trying while CHASE is away; the worker reconciles once it is back
		retryAttempts: Infinity,
		keepAlive: 30_000,
		on: { connected: () => onConnected?.() }
	});

	const urqlClient = new Client({
		url: new URL('/api/graphql', url).toString(),
		requestPolicy: 'network-only',
		fetchOptions: () => ({ headers }),
		exchanges: [
			nativeDateExchange,
			fetchExchange,
			subscriptionExchange({
				forwardSubscription: (request) => ({
					subscribe: (sink) => ({
						unsubscribe: ws.subscribe({ ...request, query: request.query ?? '' }, sink)
					})
				})
			})
		]
	});

	const options = { urqlClient, schema, autoIncludeIdField: 'id' };
	return {
		liveQuery: makeLiveQuery<Query>({ ...options, availableSubscriptions }),
		query: makeQuery<Query>(options),
		mutate: makeMutation<Mutation>(options),
		subscribe: makeSubscription<Subscription>(options),
		dispose: () => void ws.dispose()
	};
}

export type ChaseClient = ReturnType<typeof createChaseClient>;
