import { rumble } from '@m1212e/rumble';
import ValidationPlugin from '@pothos/plugin-validation';
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects';
import { trace } from '@opentelemetry/api';
import { Redis } from 'ioredis';
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';
import { configPrivate } from '$config/private';
import { db, schema } from './db/db';
import { context } from './context';

/**
 * Subscription events go through Redis when one is configured, so several app instances see each
 * other's publishes. Without `REDIS_URL` rumble keeps its in-memory event target, which is all a
 * single process needs.
 */
let eventTarget: ReturnType<typeof createRedisEventTarget> | undefined;
if (configPrivate.REDIS_URL) {
	// ioredis v6 defaults to the RESP3 wire protocol, which changes reply shapes for some
	// commands - pin the previously-default RESP2 protocol to keep behavior unchanged.
	const publishClient = new Redis(configPrivate.REDIS_URL, { protocol: 2 });
	const subscribeClient = new Redis(configPrivate.REDIS_URL, { protocol: 2 });

	eventTarget = createRedisEventTarget({ publishClient, subscribeClient });
}

export const {
	abilityBuilder,
	schemaBuilder,
	object,
	query,
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
	// Adds a trigram `search` argument to the list queries, ranked by `search_distance`. A row
	// matches when any one column is this similar to the term; pg_trgm's default of 0.3 misses
	// a prefix of a longer word ("ann" against "Annabelle" scores 0.27), 0.2 finds it.
	search: { enabled: true, threshold: 0.2 },
	// One span per operation and resolver, into the provider `src/instrumentation.server.ts`
	// registers. Variables stay out of the spans: they regularly carry personal data.
	otel: {
		enabled: !!configPrivate.OTEL_ENDPOINT_URL,
		tracer: trace.getTracer(configPrivate.OTEL_SERVICE_NAME, configPrivate.OTEL_SERVICE_VERSION),
		includeVariables: false
	},
	pothosConfig: {
		// SimpleObjects backs the ad-hoc result types a few mutations return (invitation batches,
		// review results). Rumble does not load it by default.
		plugins: [ValidationPlugin, SimpleObjectsPlugin]
	}
});

/** The context resolvers receive: the request context plus the caller's `abilities`. */
export type ApiContext = (typeof schemaBuilder)['$inferSchemaTypes']['Context'];
