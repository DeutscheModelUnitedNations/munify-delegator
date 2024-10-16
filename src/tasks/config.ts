import { z } from 'zod';

const schema = z.object({
	DATABASE_URL: z.string(),
	SLACK_NOTIFICATION_WEBHOOK: z.optional(z.string())
});

export const configPrivate = schema.parse(process.env);
