import { Type } from '@sinclair/typebox';
import { mapEnvToSchema } from './schemaMapper';
import { env } from '$env/dynamic/public';

export const dynamicPublicConfig = mapEnvToSchema({
	env,
	prefix: 'PUBLIC_',
	separator: '_',
	schema: Type.Object({
		OIDC: Type.Object({
			AUTHORITY: Type.String(),
			CLIENT_ID: Type.String()
		}),
		DEFAULT_LOCALE: Type.String({ default: 'de' })
	})
});
