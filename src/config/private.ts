import { Type } from '@sinclair/typebox';
import { mapEnvToSchema } from './schemaMapper';
import { env } from '$env/dynamic/private';

export const dynamicPrivateConfig = mapEnvToSchema({
	env,
	prefix: '',
	separator: '_',
	schema: Type.Object({
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
	})
});

console.log(`Loaded dynamic private config in ${dynamicPrivateConfig.NODE_ENV} mode`);