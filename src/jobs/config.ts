import { z } from 'zod';
import type { StorageConfig } from '$api/handlers/storedFile/storageClient';

/**
 * Everything the jobs read from the environment, validated with zod. Jobs run outside SvelteKit,
 * so `src/env.ts` does not apply. Each group is parsed on first use, so a job needs only the
 * variables it works with.
 */

/** Parses `process.env` against `schema`, reporting every problem at once. */
function parseEnv<T extends z.ZodType>(schema: T, group: string): z.output<T> {
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

export function databaseConfig() {
	return parseEnv(databaseSchema, 'the database');
}

export function storageConfig(): StorageConfig {
	const env = parseEnv(storageSchema, 'the file bucket');
	return {
		endpoint: env.S3_ENDPOINT,
		publicEndpoint: env.S3_PUBLIC_ENDPOINT,
		accessKeyId: env.S3_ACCESS_KEY_ID,
		secretAccessKey: env.S3_SECRET_ACCESS_KEY,
		region: env.S3_REGION
	};
}

/** Parsed when the sync is first imported, so the other jobs start without any of it. */
export const config = parseEnv(mailSyncSchema, 'the mail sync');
