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
import { graphqlLogger } from '#lib/logger';
import { db, schema } from './db/db';
import { context } from './context';

let eventTarget: ReturnType<typeof createRedisEventTarget> | undefined;
if (REDIS_URL) {
	const publishClient = new Redis(REDIS_URL);
	const subscribeClient = new Redis(REDIS_URL);

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
	logger: { enabled: true, logger: graphqlLogger, includeVariables: false },
	pothosConfig: {
		plugins: [SimpleObjectsPlugin]
	}
});

export type ApiContext = (typeof schemaBuilder)['$inferSchemaTypes']['Context'];
