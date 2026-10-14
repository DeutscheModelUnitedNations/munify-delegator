import type { Data, Link, UpdatesConfig } from '@urql/exchange-graphcache';
import type { IntrospectionQuery } from 'graphql';

type IntrospectionType = IntrospectionQuery['__schema']['types'][number];

function fieldNamesOf(schema: IntrospectionQuery, typeName: string | undefined): string[] {
	const type: IntrospectionType | undefined = schema.__schema.types.find(
		(candidate) => candidate.name === typeName
	);
	return type?.kind === 'OBJECT' ? type.fields.map((field) => field.name) : [];
}

function isData(value: unknown): value is Data {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A subscription's field value as a graphcache link: entities, lists of them, or null. */
function toLink(value: unknown): Link<Data> | undefined {
	if (value === null) return null;
	if (Array.isArray(value)) {
		const items = value.map(toLink);
		return items.every(isLinked) ? items : undefined;
	}
	return isData(value) ? value : undefined;
}

function isLinked(item: Link<Data> | undefined): item is Link<Data> {
	return item !== undefined;
}

/**
 * Graphcache's `updates`: every subscription result is also written to the query field of the same
 * name and arguments.
 *
 * A live query is the query merged with the subscription of the same name (rumble generates both).
 * Graphcache keeps the two apart, as `Query.committees(...)` and `Subscription.committees(...)`, so
 * a subscription result that adds or drops a row updates only the subscription's list. The entity
 * records they share change, graphcache re-reads the query from its stale list and emits that, and
 * whichever arrives last wins: a created row flickers in and vanishes, a removed one never goes.
 * Changes to existing rows were never affected, since those live in the shared entity records.
 */
export function liveQueryUpdates(schema: IntrospectionQuery): UpdatesConfig {
	const queryType = schema.__schema.queryType?.name;
	const subscriptionType = schema.__schema.subscriptionType?.name;
	if (!queryType || !subscriptionType) return {};

	const queryFields = new Set(fieldNamesOf(schema, queryType));
	const updaters: NonNullable<UpdatesConfig['Subscription']> = {};
	for (const fieldName of fieldNamesOf(schema, subscriptionType)) {
		if (!queryFields.has(fieldName)) continue;
		updaters[fieldName] = (result, args, cache) => {
			const link = toLink(result[fieldName]);
			if (link !== undefined) cache.link(queryType, fieldName, args, link);
		};
	}
	return { Subscription: updaters };
}
