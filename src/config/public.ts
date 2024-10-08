import { Type } from '@sinclair/typebox';
import { mapEnvToSchema } from './schemaMapper';
import { env } from '$env/dynamic/public';
import { building } from '$app/environment';

export const dynamicPublicConfig = mapEnvToSchema({
	env,
	prefix: 'PUBLIC_',
	separator: '_',
	building,
	schema: Type.Object({
		VERSION: Type.Optional(Type.String()),
		SHA: Type.Optional(Type.String()),
		OIDC: Type.Object({
			AUTHORITY: Type.String(),
			CLIENT_ID: Type.String()
		}),
		DEFAULT_LOCALE: Type.String({ default: 'de' }),
		FEEDBACK_URL: Type.String()
	})
});
