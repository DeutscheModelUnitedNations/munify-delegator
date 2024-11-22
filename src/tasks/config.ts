import { z } from 'zod';

const schema = z.object({
	DATABASE_URL: z.string(),
	SLACK_NOTIFICATION_WEBHOOK: z.string().optional(),
	SLACK_ERROR_WEBHOOK: z.string().optional(),
	LISTMONK_API_URL: z.string(),
	LISTMONK_API_USER: z.string(),
	LISTMONK_API_KEY: z.string()
});

export const configPrivate = schema.parse(process.env);
