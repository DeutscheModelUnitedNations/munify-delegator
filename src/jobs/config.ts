import { z } from 'zod';
import type { StorageConfig } from '#api/handlers/storedFile/storageClient';
import type { BuchhaltungsButlerConfig } from './apis/buchhaltungsbutler/buchhaltungsbutlerClient';

/**
 * Everything the jobs read from the environment, validated with zod. Jobs run outside SvelteKit,
 * so `src/env.ts` does not apply. Each group is parsed on first use, so a job needs only the
 * variables it works with.
 */

/** Parses `process.env` against `schema`, reporting every problem at once. */
function parseEnv<T extends z.ZodType>({
	schema,
	group
}: {
	schema: T;
	group: string;
}): z.output<T> {
	const result = schema.safeParse(process.env);
	if (result.success) return result.data;
	const problems = result.error.issues
		.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
		.join('\n');
	throw new Error(`Invalid environment for ${group}:\n${problems}`);
}

const databaseSchema = z.object({
	DATABASE_URL: z.string().min(1, 'is not set')
});

const storageSchema = z.object({
	S3_ENDPOINT: z.url(),
	S3_PUBLIC_ENDPOINT: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
	S3_ACCESS_KEY_ID: z.string().min(1, 'is not set'),
	S3_SECRET_ACCESS_KEY: z.string().min(1, 'is not set'),
	S3_REGION: z.preprocess((v) => (v === '' ? undefined : v), z.string().default('us-east-1'))
});

/**
 * The mail sync's variables. An unset `LISTMONK_API_URL` makes the sync abort with an error
 * instead of failing here.
 */
const mailSyncSchema = z.object({
	LISTMONK_API_URL: z.string().default(''),
	LISTMONK_API_USER: z.string().default(''),
	LISTMONK_API_KEY: z.string().default(''),
	MAIL_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(100)
});

const sendEmailsSchema = z.object({
	APP_URL: z.url()
});

/**
 * The app's public address, which the mails link to. The rest of what sending needs (the database,
 * SMTP, Redis) are the app's own variables, read through `$app/env/private` (`appEnv.ts`).
 */
export function sendEmailsConfig() {
	return parseEnv({ schema: sendEmailsSchema, group: 'sending the automatic emails' });
}

/**
 * BuchhaltungsButler's API, which the bank payment sync reads the bank accounts through: the API
 * client and secret and the customer's API key, all from BuchhaltungsButler's settings (Einstellungen
 * → API).
 */
const bankPaymentSyncSchema = z.object({
	// the requests carry the API secret and key: never without TLS
	BUCHHALTUNGSBUTLER_API_URL: z
		.url({ protocol: /^https$/, error: 'must be an https:// URL' })
		.default('https://webapp.buchhaltungsbutler.de/api/v1'),
	BUCHHALTUNGSBUTLER_API_CLIENT: z.string().min(1, 'is not set'),
	BUCHHALTUNGSBUTLER_API_SECRET: z.string().min(1, 'is not set'),
	BUCHHALTUNGSBUTLER_API_KEY: z.string().min(1, 'is not set')
});

export function bankPaymentSyncConfig(): BuchhaltungsButlerConfig {
	const env = parseEnv({ schema: bankPaymentSyncSchema, group: 'the bank payment sync' });
	return {
		baseUrl: env.BUCHHALTUNGSBUTLER_API_URL,
		apiClient: env.BUCHHALTUNGSBUTLER_API_CLIENT,
		apiSecret: env.BUCHHALTUNGSBUTLER_API_SECRET,
		apiKey: env.BUCHHALTUNGSBUTLER_API_KEY
	};
}

export function databaseConfig() {
	return parseEnv({ schema: databaseSchema, group: 'the database' });
}

export function storageConfig(): StorageConfig {
	const env = parseEnv({ schema: storageSchema, group: 'the file bucket' });
	return {
		endpoint: env.S3_ENDPOINT,
		publicEndpoint: env.S3_PUBLIC_ENDPOINT,
		accessKeyId: env.S3_ACCESS_KEY_ID,
		secretAccessKey: env.S3_SECRET_ACCESS_KEY,
		region: env.S3_REGION
	};
}

/** Parsed when the sync is first imported, so the other jobs start without any of it. */
export const config = parseEnv({ schema: mailSyncSchema, group: 'the mail sync' });
