import SchemaBuilder, {
	BasePlugin,
	type PothosOutputFieldConfig,
	type SchemaTypes
} from '@pothos/core';
import type { GraphQLFieldResolver } from 'graphql';
import { refreshAbilities } from '@m1212e/rumble';
import type { Context } from '#api/context';
import { refreshCallerFacts } from './callerFacts';

/**
 * Loads the caller's facts (`callerFacts`) again whenever a root field (a query, a mutation or a
 * subscription event) starts to resolve, the way rumble's own RefreshAbilitiesPlugin starts a new
 * snapshot of its resolved rules there: a mutation's second root field sees what the first wrote,
 * and a live query refetching sees the caller's parts as they are now. Rumble's plugin has already
 * dropped its prepared filters by the time this runs; they are dropped once more after the load,
 * so a filter prepared while it ran is not kept with the facts it replaced.
 */
export const refreshCallerFactsPluginName = 'refreshCallerFacts';

/* eslint-disable @typescript-eslint/no-namespace -- Pothos types its plugins in this global namespace */
declare global {
	// fallow-ignore-next-line unused-type -- a declaration merge into Pothos' own namespace, read by Pothos
	export namespace PothosSchemaTypes {
		export interface Plugins<Types extends SchemaTypes> {
			refreshCallerFacts: RefreshCallerFactsPlugin<Types>;
		}
	}
}
/* eslint-enable @typescript-eslint/no-namespace */

/** Whether the resolver's context is the request context, which carries the facts. */
function isRequestContext(value: unknown): value is Context & { abilities?: object } {
	return typeof value === 'object' && value !== null && 'callerFactsCache' in value;
}

// A class only because Pothos plugins are one: `SchemaBuilder.registerPlugin` takes a subclass of
// its `BasePlugin`.
class RefreshCallerFactsPlugin<Types extends SchemaTypes> extends BasePlugin<Types> {
	override wrapResolve(
		resolver: GraphQLFieldResolver<unknown, Types['Context'], object>,
		fieldConfig: PothosOutputFieldConfig<Types>
	): GraphQLFieldResolver<unknown, Types['Context'], object> {
		const { kind } = this.buildCache.getTypeConfig(fieldConfig.parentType);
		if (kind !== 'Query' && kind !== 'Mutation' && kind !== 'Subscription') return resolver;
		return async (parent, args, context, info) => {
			if (isRequestContext(context) && context.callerFactsCache.loading) {
				await refreshCallerFacts(context);
				refreshAbilities(context.abilities);
			}
			return resolver(parent, args, context, info);
		};
	}
}

SchemaBuilder.registerPlugin(refreshCallerFactsPluginName, RefreshCallerFactsPlugin);
