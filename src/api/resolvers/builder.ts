import { dev } from '$app/environment';
import { db } from '$db/db';
import SchemaBuilder from '@pothos/core';
import PrismaPlugin from '@pothos/plugin-prisma';
import PrismaUtils from '@pothos/plugin-prisma-utils';
import type PrismaTypes from '../../../prisma/pothos/generated';
import { getDatamodel } from '../../../prisma/pothos/generated';
import ComplexityPlugin from '@pothos/plugin-complexity';
import TracingPlugin, { isRootField } from '@pothos/plugin-tracing';
import { createOpenTelemetryWrapper } from '@pothos/tracing-opentelemetry';
import type { Scalars } from 'prisma-generator-pothos-codegen';
import { type Prisma } from '@prisma/client';
import { type Context } from '$api/context/context';
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects';
import { tracer } from './tracer';

const createSpan = createOpenTelemetryWrapper(tracer, {
	includeSource: true,
	includeArgs: true,
	onSpan(span, options, parent, args, context, info) {
		if ((context as any)?.oidc?.user) {
			span.setAttributes({ 'oidc.user.email': (context as any).oidc.user.email });
		}
	}
});

export const builder = new SchemaBuilder<{
	Context: Context;
	Scalars: Scalars<Prisma.Decimal, Prisma.InputJsonValue | null, Prisma.InputJsonValue> & {
		File: {
			Input: File;
			Output: never;
		};
		JSONObject: {
			Input: any;
			Output: any;
		};
	};
	PrismaTypes: PrismaTypes;
	DefaultFieldNullability: false;
	DefaultArgumentNullability: false;
	DefaultInputFieldRequiredness: true;
}>({
	defaultFieldNullability: false,
	defaultInputFieldRequiredness: true,
	plugins: [PrismaPlugin, PrismaUtils, ComplexityPlugin, TracingPlugin, SimpleObjectsPlugin],
	prisma: {
		client: db,
		dmmf: getDatamodel(),
		exposeDescriptions: true,
		filterConnectionTotalCount: true,
		// warn when not using a query parameter correctly
		onUnusedQuery: !dev ? null : 'warn'
	},
	complexity: {
		defaultComplexity: 1,
		defaultListMultiplier: 10,
		limit: {
			complexity: 114780,
			depth: 100,
			breadth: 1940
		}
	},
	tracing: {
		default: (config) => isRootField(config),
		wrap: (resolver, options) => createSpan(resolver, options)
	}
});

// this tells the dev server to reload the cache of the schema builder to prevent buildup of non
// existent fields/queries
if (dev) {
	import('./api');
}

builder.scalarType('File', {
	serialize: async () => {
		throw new Error('File type cannot be serialized');
	}
});

builder.scalarType('JSONObject', {
	serialize: (value) => {
		return JSON.stringify(value);
	},

	parseValue: (value: any) => {
		if (value !== null && value !== undefined) {
			return JSON.parse(value);
		} else {
			throw new Error('JSONObject cannot represent non-object value: ' + value);
		}
	}
});
