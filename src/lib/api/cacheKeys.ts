import type { KeyingConfig } from '@urql/exchange-graphcache';
import type { IntrospectionQuery } from 'graphql';

/**
 * Types keyed by something other than `id`. A nation is identified by its ISO code; it has no
 * surrogate key.
 *
 * `id` itself never needs selecting: the generated client adds it to every selection of a type
 * that has one (`autoIncludeIdField` in `src/api/handlers/register.ts`).
 */
const customKeyFields: Record<string, string> = { Nation: 'alpha3Code' };

type IntrospectionType = IntrospectionQuery['__schema']['types'][number];
type IntrospectionObjectType = Extract<IntrospectionType, { kind: 'OBJECT' }>;

/** The names of the query, mutation and subscription types the schema has. */
function rootTypeNames(schema: IntrospectionQuery): Set<string> {
	const { queryType, mutationType, subscriptionType } = schema.__schema;
	return new Set(
		[queryType?.name, mutationType?.name, subscriptionType?.name].filter(
			(name): name is string => !!name
		)
	);
}

/** An object type of the API itself: not introspection's own, and not a root type. */
function isEntityObjectType(
	type: IntrospectionType,
	rootTypes: Set<string>
): type is IntrospectionObjectType {
	return type.kind === 'OBJECT' && !type.name.startsWith('__') && !rootTypes.has(type.name);
}

/**
 * Graphcache's `keys`: the custom key fields, and `null` for every object type without an identity
 * - statistics, search results and other computed objects. Those are meant to be stored embedded in
 * their parent; saying so explicitly is what tells graphcache it is not a missing `id`.
 */
export function graphcacheKeys(schema: IntrospectionQuery): KeyingConfig {
	const rootTypes = rootTypeNames(schema);

	const keys: KeyingConfig = {};
	for (const [typeName, keyField] of Object.entries(customKeyFields)) {
		keys[typeName] = (data) => {
			const key = data[keyField];
			return typeof key === 'string' ? key : null;
		};
	}
	const identityless = schema.__schema.types.filter(
		(type) =>
			isEntityObjectType(type, rootTypes) &&
			!(type.name in keys) &&
			!type.fields.some((field) => field.name === 'id')
	);
	for (const type of identityless) {
		keys[type.name] = () => null;
	}
	return keys;
}
