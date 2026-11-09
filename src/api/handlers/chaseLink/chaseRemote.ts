import { Client, fetchExchange, subscriptionExchange, type CombinedError } from '@urql/core';
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

/** How long a WebSocket may take to open before it is given up and tried again. */
const OPEN_TIMEOUT_MS = 10_000;

/**
 * The platform's WebSocket, closed when it does not open in time. A server that accepts the
 * connection but never answers the upgrade (CHASE while it starts) would otherwise keep it
 * connecting forever, and graphql-ws would never try again.
 */
const TimedWebSocket = Object.assign(
	function TimedWebSocket(url: string | URL, protocols?: string | string[]) {
		const socket = new WebSocket(url, protocols);
		const timer = setTimeout(() => {
			if (socket.readyState === WebSocket.CONNECTING) socket.close();
		}, OPEN_TIMEOUT_MS);
		const settle = () => clearTimeout(timer);
		socket.addEventListener('open', settle);
		socket.addEventListener('close', settle);
		return socket;
	},
	{
		CONNECTING: WebSocket.CONNECTING,
		OPEN: WebSocket.OPEN,
		CLOSING: WebSocket.CLOSING,
		CLOSED: WebSocket.CLOSED
	}
);

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
	onConnected,
	onError
}: {
	url: string;
	token?: string;
	/** Every (re)connect of the WebSocket, when updates may have been missed. */
	onConnected?: () => void;
	/** An update a live query skipped, keeping its last rows. */
	onError?: (error: CombinedError) => void;
}) {
	const headers: Record<string, string> = token ? { [LINK_TOKEN_HEADER]: token } : {};
	const wsUrl = new URL('/api/graphql', url);
	wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
	// connected from the start, so a CHASE that comes back is noticed (`onConnected`) even while
	// nothing is subscribed
	const ws = createWSClient({
		url: wsUrl.toString(),
		connectionParams: headers,
		lazy: false,
		// keep trying while CHASE is away; the worker reconciles once it is back. Every failure counts:
		// graphql-ws retries only close events by default, and a CHASE restarting refuses the
		// connection instead, which left the client stopped for good.
		retryAttempts: Infinity,
		shouldRetry: () => true,
		keepAlive: 30_000,
		webSocketImpl: TimedWebSocket,
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

	// every selection carries the id, in the result types too
	const options = { urqlClient, schema, autoIncludeIdField: 'id' };
	return {
		liveQuery: makeLiveQuery<Query, false, 'id'>({ ...options, availableSubscriptions, onError }),
		query: makeQuery<Query, false, 'id'>(options),
		mutate: makeMutation<Mutation, 'id'>(options),
		subscribe: makeSubscription<Subscription, 'id'>(options),
		dispose: () => void ws.dispose()
	};
}

export type ChaseClient = ReturnType<typeof createChaseClient>;
