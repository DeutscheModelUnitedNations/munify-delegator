import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { mapEnvToSchema } from './schemaMapper';
import { env } from '$env/dynamic/private';

const schema = Type.Object({
	DATABASE_URL: Type.String(),
	OIDC: Type.Object({
		CLIENT_SECRET: Type.Optional(Type.String())
	}),
	SECRET: Type.String(),
	NODE_ENV: Type.Union([
		Type.Literal('development'),
		Type.Literal('production'),
		Type.Literal('test')
	])
});

let raw = mapEnvToSchema({
	env,
	prefix: '',
	schema,
	separator: '_'
});

export const privateConfig = Value.Decode(schema, raw);
