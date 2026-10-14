import { rumble } from '@m1212e/rumble';
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects';
import { trace } from '@opentelemetry/api';
import { Redis } from 'ioredis';
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';
import {
	OTEL_ENDPOINT_URL,
	OTEL_SERVICE_NAME,
	OTEL_SERVICE_VERSION,
	REDIS_URL
} from '$app/env/private';
import { db, schema } from './db/db';
import { context } from './context';

/**
 * Subscription events go through Redis when one is configured, so several app instances see each
 * other's publishes. Without `REDIS_URL` rumble keeps its in-memory event target, which is all a
 * single process needs.
 */
let eventTarget: ReturnType<typeof createRedisEventTarget> | undefined;
if (REDIS_URL) {
	// ioredis v6 defaults to the RESP3 wire protocol, which changes reply shapes for some
	// commands - pin the previously-default RESP2 protocol to keep behavior unchanged.
	const publishClient = new Redis(REDIS_URL, { protocol: 2 });
	const subscribeClient = new Redis(REDIS_URL, { protocol: 2 });

	eventTarget = createRedisEventTarget({ publishClient, subscribeClient });
}

export const {
	abilityBuilder,
	schemaBuilder,
	object,
	query,
	countQuery,
	pubsub,
	createYoga,
	enum_,
	clientCreator
} = rumble({
	db,
	schema,
	context,
	defaultLimit: 1000,
	subscriptions: [{ eventTarget }],
	actions: ['read', 'update', 'delete'],
	search: { enabled: true, threshold: 0.3 },
	otel: {
		enabled: !!OTEL_ENDPOINT_URL,
		tracer: trace.getTracer(OTEL_SERVICE_NAME, OTEL_SERVICE_VERSION),
		includeVariables: false
	},
	pothosConfig: {
		// SimpleObjects backs the ad-hoc result types a few mutations return (invitation batches,
		// review results). Rumble does not load it by default.
		plugins: [SimpleObjectsPlugin]
	}
});

/** The context resolvers receive: the request context plus the caller's `abilities`. */
export type ApiContext = (typeof schemaBuilder)['$inferSchemaTypes']['Context'];
