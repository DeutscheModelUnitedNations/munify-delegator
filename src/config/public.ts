import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { mapEnvToSchema } from './schemaMapper';
import { env } from '$env/dynamic/public';

const schema = Type.Object({
	OIDC: Type.Object({
		AUTHORITY: Type.String(),
		CLIENT_ID: Type.String(),
	}),
	HOSTNAME: Type.String(),
});

let raw = mapEnvToSchema({
	env,
	prefix: 'PUBLIC_',
	schema,
	separator: '_'
});

export const publicConfig = Value.Decode(schema, raw);

console.log(publicConfig);
