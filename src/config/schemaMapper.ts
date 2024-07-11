import { Value } from '@sinclair/typebox/value';
import type { TSchema } from 'elysia';

// Function to map environment variables to schema
export function mapEnvToSchema({
	env,
	prefix,
	schema,
	separator
}: {
	schema: TSchema;
	prefix: string;
	env: any;
	separator: string;
}) {
	let ret = Object.keys(schema.properties).reduce((acc, key) => {
		const fullKey = prefix + key;
		const property = schema.properties[key];
		if (property.type === 'object') {
			acc[key] = mapEnvToSchema({
				schema: property,
				prefix: fullKey + separator,
				env,
				separator
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

	return ret;
}
