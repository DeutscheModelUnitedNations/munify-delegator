import { dev } from '$app/environment';
import { db } from '$db/db';
import SchemaBuilder from '@pothos/core';
import PrismaPlugin from '@pothos/plugin-prisma';
import PrismaUtils from '@pothos/plugin-prisma-utils';
import type PrismaTypes from '@pothos/plugin-prisma/generated';
import ComplexityPlugin from '@pothos/plugin-complexity';
import TracingPlugin, { wrapResolver, isRootField } from '@pothos/plugin-tracing';
import type { Scalars } from 'prisma-generator-pothos-codegen';
import type { Prisma } from '@prisma/client';
import { type Context } from '$api/context/context';
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects';

export const builder = new SchemaBuilder<{
	Context: Context;
	Scalars: Scalars<Prisma.Decimal, Prisma.InputJsonValue | null, Prisma.InputJsonValue>;
	PrismaTypes: PrismaTypes;
	DefaultFieldNullability: false;
}>({
	defaultFieldNullability: false,
	plugins: [PrismaPlugin, PrismaUtils, ComplexityPlugin, TracingPlugin, SimpleObjectsPlugin],
	prisma: {
		client: db,
		exposeDescriptions: true,
		filterConnectionTotalCount: true,
		// warn when not using a query parameter correctly
		onUnusedQuery: !dev ? null : 'warn'
	},
	complexity: {
		defaultComplexity: 1,
		defaultListMultiplier: 10,
		limit: {
			complexity: 1321,
			depth: 10,
			breadth: 50
		}
	},
	tracing: {
		// Enable tracing for rootFields by default, other fields need to opt in
		default: (config) => isRootField(config),
		// Log resolver execution duration
		wrap: (resolver, _options, config) =>
			wrapResolver(resolver, (_error, duration) => {
				console.info(`Executed resolver ${config.parentType}.${config.name} in ${duration}ms`);
			})
	}
});

// this tells the dev server to reload the cache of the schema builder to prevent buildup of non
// existent fields/queries
if (dev) {
	import('./api');
}
