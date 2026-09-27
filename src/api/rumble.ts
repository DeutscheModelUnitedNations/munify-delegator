import { rumble } from '@m1212e/rumble';
import ValidationPlugin from '@pothos/plugin-validation';
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects';
import { dev } from '$app/environment';
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

// Tells the dev server to reload the schema builder's cache, so fields and queries from a
// previous build don't accumulate. Mirrors chase.
if (dev) {
	import('$api/handlers/register');
}

export const {
	abilityBuilder,
	schemaBuilder,
	whereArg,
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
	// `impersonate` is delegator-specific: the CASL layer modelled it as an action on User and
	// the management UI depends on it. Chase has no equivalent, so there is no pattern to copy.
	actions: ['read', 'update', 'delete', 'impersonate'],
	pothosConfig: {
		// SimpleObjects backs the ad-hoc result types a few mutations return (invitation batches,
		// review results). Rumble does not load it by default.
		plugins: [ValidationPlugin, SimpleObjectsPlugin]
	}
});
