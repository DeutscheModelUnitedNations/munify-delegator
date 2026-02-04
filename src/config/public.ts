import { building } from '$app/environment';
import { env } from '$env/dynamic/public';
import { z } from 'zod';

const schema = z.object({
	PUBLIC_VERSION: z.optional(z.string()),
	PUBLIC_SHA: z.optional(z.string()),
	PUBLIC_OIDC_AUTHORITY: z.string(),
	PUBLIC_OIDC_CLIENT_ID: z.string(),
	PUBLIC_DEFAULT_LOCALE: z.string().default('de'),
	PUBLIC_FEEDBACK_URL: z.optional(z.string()),
	PUBLIC_GLOBAL_USER_NOTES_ACTIVE: z.coerce.boolean().default(false),

	PUBLIC_MAX_APPLICATION_TEXT_LENGTH: z.coerce.number().default(1200),
	PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH: z.coerce.number().default(100),

	PUBLIC_MAINTENANCE_WINDOW_START: z.iso.datetime({ offset: true }).optional(),
	PUBLIC_MAINTENANCE_WINDOW_END: z.iso.datetime({ offset: true }).optional(),
	// Sentry/Bugsink error tracking
	PUBLIC_SENTRY_DSN: z.string().url().optional(),
	PUBLIC_SENTRY_SEND_DEFAULT_PII: z.stringbool().optional(),

	// Badge generator URL (optional)
	PUBLIC_BADGE_GENERATOR_URL: z.string().url().optional(),

	// Documentation URL (optional) - global link to DELEGATOR app documentation
	PUBLIC_DOCS_URL: z.string().url().optional(),

	// Team organization domain (optional) - warn when inviting emails from other domains
	PUBLIC_TEAM_ORGANIZATION_DOMAIN: z.string().optional()
});

export const configPublic = building ? ({} as z.infer<typeof schema>) : schema.parse(env);
