import { defineEnvVars } from '@sveltejs/kit/env';
import { building } from '$app/env';
import { z } from 'zod';

/** An unset or empty variable counts as not given. */
const unlessEmpty = <T extends z.ZodType<unknown, string | undefined>>(schema: T) =>
	z
		.string()
		.optional()
		.transform((value) => (value === '' ? undefined : value))
		.pipe(schema);

/** A number, `fallback` when unset. */
const numberOr = (fallback: number) =>
	z
		.string()
		.optional()
		.transform((value) => (value === undefined || value === '' ? fallback : Number(value)))
		.pipe(z.number());

/**
 * A variable that must be set when the app runs, but not while SvelteKit analyses it during
 * `vite build`, which happens without the deployment's environment.
 */
const requiredAtRuntime = <T extends z.ZodType<unknown, string | undefined>>(
	schema: T,
	placeholder: string
) =>
	z
		.string()
		.optional()
		.transform((value) => (building && value === undefined ? placeholder : value))
		.pipe(schema);

/**
 * Every environment variable the app reads, validated when it starts (or builds). Import them by
 * name from `$app/env/private` (server only) or `$app/env/public` (also the browser).
 * `src/jobs/` reads its own variables from `process.env`, since it runs outside SvelteKit.
 */
export const variables = defineEnvVars({
	// --- Private ---
	DATABASE_URL: { schema: requiredAtRuntime(z.string(), '') },
	NODE_ENV: {
		schema: requiredAtRuntime(
			z.union([z.literal('development'), z.literal('production'), z.literal('test')]),
			'production'
		)
	},
	// Unread since the OIDC flow moved to @m1212e/sveltekit-oidc, which manages its own cookies.
	// Kept required so a deployment does not silently lose it before something needs it again.
	SECRET: { schema: requiredAtRuntime(z.string(), '') },
	CERTIFICATE_SECRET: { schema: requiredAtRuntime(z.string(), '') },

	OIDC_SCOPES: { schema: requiredAtRuntime(z.string(), '') },
	OIDC_CLIENT_SECRET: { schema: z.string().optional() },
	OIDC_ROLE_CLAIM: { schema: z.string().optional() },
	// Audience for resource-scoped access tokens. Unread since the OIDC flow moved to
	// @m1212e/sveltekit-oidc, which does not send a resource indicator.
	OIDC_RESOURCE: { schema: z.string().url().optional() },
	// Machine-to-machine credentials for the Logto Management API. Unread while impersonation is
	// stalled (see $lib/data/impersonation), kept so deployments do not have to drop them.
	OIDC_M2M_CLIENT_ID: { schema: z.string().optional() },
	OIDC_M2M_CLIENT_SECRET: { schema: z.string().optional() },
	// Logto Management API resource indicator (e.g. https://default.logto.app/api)
	OIDC_M2M_RESOURCE: { schema: unlessEmpty(z.string().url().optional()) },

	OTEL_SERVICE_NAME: { schema: z.string().default('MUNIFY-DELEGATOR') },
	OTEL_SERVICE_VERSION: { schema: z.string().optional() },
	OTEL_ENDPOINT_URL: { schema: z.string().optional() },
	OTEL_AUTHORIZATION_HEADER: { schema: z.string().optional() },

	// SMTP / Transactional Email Configuration
	SMTP_HOST: { schema: z.string().default('localhost') },
	SMTP_PORT: { schema: numberOr(1025) },
	SMTP_SECURE: {
		schema: z
			.string()
			.default('false')
			.transform((value) => value === 'true')
	},
	SMTP_USER: { schema: z.string().optional() },
	SMTP_PASSWORD: { schema: z.string().optional() },
	SMTP_FROM_ADDRESS: { schema: z.string().email().default('noreply@munify.cloud') },
	SMTP_FROM_NAME: { schema: z.string().default('MUNify Delegator') },

	// Distributed pubsub for GraphQL subscriptions. Without it rumble falls back to an in-memory
	// event target, which is fine for a single process but drops events between instances.
	REDIS_URL: { schema: z.string().optional() },

	// Sentry/Bugsink error tracking
	SENTRY_DSN: { schema: unlessEmpty(z.string().url().optional()) },
	SENTRY_SEND_DEFAULT_PII: { schema: z.stringbool().optional() },

	// --- Public ---
	PUBLIC_VERSION: { public: true, schema: z.string().optional() },
	PUBLIC_SHA: { public: true, schema: z.string().optional() },
	PUBLIC_OIDC_AUTHORITY: { public: true, schema: requiredAtRuntime(z.string(), '') },
	PUBLIC_OIDC_CLIENT_ID: { public: true, schema: requiredAtRuntime(z.string(), '') },
	PUBLIC_DEFAULT_LOCALE: { public: true, schema: z.string().default('de') },
	PUBLIC_OIDC_ACCOUNT_URL: { public: true, schema: unlessEmpty(z.string().url().optional()) },
	PUBLIC_FEEDBACK_URL: { public: true, schema: z.string().optional() },
	PUBLIC_GLOBAL_USER_NOTES_ACTIVE: {
		public: true,
		schema: unlessEmpty(z.stringbool().default(false))
	},

	// Full URL of the FontAwesome stylesheet (must bundle all used styles, e.g. `all.min.css`)
	PUBLIC_FONTAWESOME_CSS_URL: {
		public: true,
		schema: unlessEmpty(
			z
				.string()
				.url()
				.default('https://cdn.dmun.de/cdn/fontawesome-pro-7.0.0-web/css/all.min.css?v=825d23a4')
		)
	},
	// Stylesheet with the Sharp Duotone font, which `all.min.css` does not bundle. Without it
	// `fa-sharp-duotone` draws both duotone layers as the same plain glyph, i.e. every icon twice.
	PUBLIC_FONTAWESOME_SHARP_DUOTONE_CSS_URL: {
		public: true,
		schema: unlessEmpty(
			z
				.string()
				.url()
				.default(
					'https://cdn.dmun.de/cdn/fontawesome-pro-7.0.0-web/css/sharp-duotone-solid.min.css'
				)
		)
	},

	// --- TEMPORARY: Migration notice (remove after migration period) ---
	PUBLIC_OIDC_MIGRATION_NOTICE: {
		public: true,
		schema: unlessEmpty(z.stringbool().default(false))
	},

	PUBLIC_MAX_APPLICATION_TEXT_LENGTH: { public: true, schema: numberOr(1200) },
	PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH: { public: true, schema: numberOr(100) },

	PUBLIC_MAINTENANCE_WINDOW_START: {
		public: true,
		schema: z.iso.datetime({ offset: true }).optional()
	},
	PUBLIC_MAINTENANCE_WINDOW_END: {
		public: true,
		schema: z.iso.datetime({ offset: true }).optional()
	},

	// Sentry/Bugsink error tracking
	PUBLIC_SENTRY_DSN: { public: true, schema: unlessEmpty(z.string().url().optional()) },
	PUBLIC_SENTRY_SEND_DEFAULT_PII: { public: true, schema: z.stringbool().optional() },

	// Badge generator URL (optional)
	PUBLIC_BADGE_GENERATOR_URL: { public: true, schema: unlessEmpty(z.string().url().optional()) },

	// Documentation URL (optional) - global link to DELEGATOR app documentation
	PUBLIC_DOCS_URL: { public: true, schema: unlessEmpty(z.string().url().optional()) },

	// Support email for error pages and help requests
	PUBLIC_SUPPORT_EMAIL: { public: true, schema: z.string().email().default('support@dmun.de') },

	// Team organization domain (optional) - warn when inviting emails from other domains
	PUBLIC_TEAM_ORGANIZATION_DOMAIN: { public: true, schema: z.string().optional() }
});
