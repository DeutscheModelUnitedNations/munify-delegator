import { z } from 'zod/v4';

const schema = z.object({
	DATABASE_URL: z.string(),
	SLACK_NOTIFICATION_WEBHOOK: z.string().optional(),
	SLACK_ERROR_WEBHOOK: z.string().optional(),
	LISTMONK_API_URL: z.string(),
	LISTMONK_API_USER: z.string(),
	LISTMONK_API_KEY: z.string()
});

export const config = schema.parse(process.env);
