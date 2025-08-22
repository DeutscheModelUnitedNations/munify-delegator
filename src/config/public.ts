import { building } from '$app/environment';
import { env } from '$env/dynamic/public';
import { z } from 'zod/v4';

const schema = z.object({
	PUBLIC_VERSION: z.optional(z.string()),
	PUBLIC_SHA: z.optional(z.string()),
	PUBLIC_OIDC_AUTHORITY: z.string(),
	PUBLIC_OIDC_CLIENT_ID: z.string(),
	PUBLIC_DEFAULT_LOCALE: z.string().default('de'),
	PUBLIC_FEEDBACK_URL: z.optional(z.string()),
	PUBLIC_GLOBAL_USER_NOTES_ACTIVE: z.optional(z.stringbool()).default(false)
});

export const configPublic = building ? ({} as z.infer<typeof schema>) : schema.parse(env);
