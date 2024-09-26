import { Value } from '@sinclair/typebox/value';
import type { TSchema, Static } from '@sinclair/typebox';

// Function to map environment variables to schema
export function mapEnvToSchema<T extends TSchema>({
	env,
	prefix,
	schema,
	separator,
	building
}: {
	schema: T;
	prefix: string;
	env: any;
	separator: string;
	building: boolean
}) {
	// this is run statically sometimes, we dont want this to error during build/prerender
	if (building) {
		return {} as Static<typeof schema>;
	}

	let ret = Object.keys(schema.properties).reduce((acc, key) => {
		const fullKey = prefix + key;
		const property = schema.properties[key];
		if (property.type === 'object') {
			acc[key] = mapEnvToSchema({
				schema: property,
				prefix: fullKey + separator,
				env,
				separator,
				building
			});
		} else {
			const envValue = env[fullKey];
			if (envValue !== undefined) {
				acc[key] = envValue;
			}
		}
		return acc;
	}, {} as any);

	// ret = Value.Cast(schema, ret);
	Value.Default(schema, ret);

	const schemaErrors = [...Value.Errors(schema, ret)];
	if (schemaErrors.length > 0) {
		throw new Error(
			`Error(s) in validating env config schema: ${schemaErrors.map((e) => JSON.stringify(e)).join(', ')}`
		);
	}

	return Value.Decode(schema, ret);
}
