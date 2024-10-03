import { Type } from '@sinclair/typebox';
import { mapEnvToSchema } from './schemaMapper';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

export const dynamicPrivateConfig = mapEnvToSchema({
	env,
	prefix: '',
	separator: '_',
	building,
	schema: Type.Object({
		DATABASE_URL: Type.String(),
		OIDC: Type.Object({
			CLIENT_SECRET: Type.Optional(Type.String()),
			SCOPES: Type.Optional(
				Type.String({
					default:
						'openid profile offline_access address email family_name gender given_name locale name phone preferred_username urn:zitadel:iam:org:projects:roles urn:zitadel:iam:user:metadata'
				})
			),
			ROLE_CLAIM: Type.String()
		}),
		SECRET: Type.String(),
		NODE_ENV: Type.Union([
			Type.Literal('development'),
			Type.Literal('production'),
			Type.Literal('test')
		])
	})
});

console.info(`Loaded dynamic private config in ${dynamicPrivateConfig.NODE_ENV} mode`);
