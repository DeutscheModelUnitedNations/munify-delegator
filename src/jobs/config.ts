import { z } from 'zod';

/**
 * What the mail sync reads from the environment. Parsed when the sync is first imported, so the
 * other jobs start without any of it. An unset `LISTMONK_API_URL` makes the sync abort with an
 * error instead of failing here.
 */
const schema = z.object({
	LISTMONK_API_URL: z.string().default(''),
	LISTMONK_API_USER: z.string().default(''),
	LISTMONK_API_KEY: z.string().default(''),
	MAIL_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(100)
});

export const config = schema.parse(process.env);
