import { rumble } from '@m1212e/rumble';
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects';
// rumble installs these plugins; this brings in their types (`subscribe`, `validate`, `t.validate`).
import type {} from '@pothos/plugin-smart-subscriptions';
import type {} from '@pothos/plugin-validation';
import { trace } from '@opentelemetry/api';
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';
import { createPubSub } from 'graphql-yoga';
import { OTEL_ENDPOINT_URL, OTEL_SERVICE_NAME, OTEL_SERVICE_VERSION } from '$app/env/private';
import { redisClient } from './services/redisClient';
import { graphqlLogger } from '#lib/logger';
import { apiError } from './services/errors';
import { db, schema } from './db/db';
import { context } from './context';
import { refreshCallerFactsPluginName } from './services/authHelper/refreshCallerFactsPlugin';

const publishClient = redisClient();
const subscribeClient = redisClient();
const eventTarget =
	publishClient && subscribeClient
		? createRedisEventTarget({ publishClient, subscribeClient })
		: undefined;

/**
 * Signals from one app instance to all of them that are not about a table, over the subscriptions'
 * Redis channel (within this process without Redis). `linkSyncRequested` asks whichever instance
 * runs the CHASE link worker to read everything again (`requestLinkSync`).
 */
export const instanceSignals = createPubSub<{ linkSyncRequested: [request: { at: string }] }>(
	eventTarget ? { eventTarget } : {}
);

export const {
	abilityBuilder,
	schemaBuilder,
	object,
	query,
	countQuery,
	pubsub,
	createYoga,
	enum_,
	clientCreator,
	buildSchema
} = rumble({
	db,
	schema,
	context,
	defaultLimit: 1000,
	// Relational rules are looked up once per request and become id lists in the statements,
	// instead of nested exists at every nesting site that cost Postgres ~100 MB to plan.
	resolveRelationalRules: { enabled: true },
	subscriptions: [{ eventTarget }],
	actions: ['read', 'update', 'delete'],
	search: { enabled: true, threshold: 0.3 },
	otel: {
		enabled: !!OTEL_ENDPOINT_URL,
		tracer: trace.getTracer(OTEL_SERVICE_NAME, OTEL_SERVICE_VERSION),
		includeVariables: false
	},
	// The trace ids come from the logger itself, on every line (`#lib/logger`)
	logger: { enabled: true, logger: graphqlLogger, includeVariables: false, injectTraceId: false },
	// Argument schemas word their issues with `m.…()` messages, so these are shown as they are.
	validation: {
		validationError: (failure) =>
			apiError({
				code: 'INVALID_INPUT',
				message: failure.issues.map((issue) => issue.message).join(' ')
			})
	},
	pothosConfig: {
		plugins: [SimpleObjectsPlugin, refreshCallerFactsPluginName]
	}
});

export type ApiContext = (typeof schemaBuilder)['$inferSchemaTypes']['Context'];
