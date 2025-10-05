import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { z } from 'zod';

const schema = z.object({
	DATABASE_URL: z.string(),
	OIDC_CLIENT_SECRET: z.optional(z.string()),
	OIDC_SCOPES: z
		.string()
		.transform((v) => v.trim())
		.refine((v) => v.length > 0, 'OIDC_SCOPES must be set')
		.refine((v) => v.split(/\s+/).includes('openid'), 'OIDC_SCOPES must include "openid"')
		.refine(
			(v) => v.split(/\s+/).includes('offline_access'),
			'OIDC_SCOPES must include "offline_access"'
		),
	OIDC_ROLE_CLAIM: z.string().nullish(),
	SECRET: z.string(),
	NODE_ENV: z.union([z.literal('development'), z.literal('production'), z.literal('test')]),
	OTEL_SERVICE_NAME: z.string().default('MUNIFY-DELEGATOR'),
	OTEL_SERVICE_VERSION: z.optional(z.string()),
	OTEL_ENDPOINT_URL: z.optional(z.string()),
	OTEL_AUTHORIZATION_HEADER: z.optional(z.string()),
	CERTIFICATE_SECRET: z.string()
});

export const configPrivate = building ? ({} as z.infer<typeof schema>) : schema.parse(env);
