import { env } from '$env/dynamic/public';
import { z } from 'zod';

const schema = z.object({
	PUBLIC_VERSION: z.optional(z.string()),
	PUBLIC_SHA: z.optional(z.string()),
	PUBLIC_OIDC_AUTHORITY: z.string(),
	PUBLIC_OIDC_CLIENT_ID: z.string(),
	PUBLIC_DEFAULT_LOCALE: z.string().default('de'),
	PUBLIC_FEEDBACK_URL: z.string()
});

export const configPublic = schema.parse(env);
