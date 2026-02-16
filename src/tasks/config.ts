import { z } from 'zod';

export const TASK_CRON_DEFAULTS = {
	MAIL_SYNC: '0 */15 * * * *',
	CONFERENCE_STATUS: '0 0 9,20 * * *'
} as const;

export type TaskId = keyof typeof TASK_CRON_DEFAULTS;

export function isTaskEnabled(id: TaskId): boolean {
	return !!process.env[`TASK_CRON_${id}`];
}

function requiredForTask(taskId: TaskId) {
	return isTaskEnabled(taskId) ? z.string() : z.string().default('');
}

const schema = z.object({
	DATABASE_URL: z.string(),
	SLACK_NOTIFICATION_WEBHOOK: z.string().optional(),
	SLACK_ERROR_WEBHOOK: z.string().optional(),
	LISTMONK_API_URL: requiredForTask('MAIL_SYNC'),
	LISTMONK_API_USER: requiredForTask('MAIL_SYNC'),
	LISTMONK_API_KEY: requiredForTask('MAIL_SYNC'),
	MAIL_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(100),
	TASKS_TZ: z.string().default('Europe/Berlin'),
	TASK_CRON_MAIL_SYNC: z.string().optional(),
	TASK_CRON_CONFERENCE_STATUS: z.string().optional()
});

export const config = schema.parse(process.env);

export function getTaskSchedule(taskId: TaskId): string | undefined {
	return process.env[`TASK_CRON_${taskId}`] || undefined;
}
