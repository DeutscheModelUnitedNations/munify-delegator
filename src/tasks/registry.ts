import schedule from 'node-schedule';
import { TASK_CRON_DEFAULTS, type TaskId, getTaskSchedule, config } from './config';
import { logLoading } from './logs';

export async function registerTask(
	id: TaskId,
	displayName: string,
	run: () => Promise<void>
): Promise<void> {
	const value = getTaskSchedule(id);

	if (!value) {
		console.info(`Task "${displayName}" is disabled (TASK_CRON_${id} not set)`);
		return;
	}

	if (value === 'once') {
		console.info(`Running task "${displayName}" once immediately...`);
		await run();
		return;
	}

	const cron = value === 'default' ? TASK_CRON_DEFAULTS[id] : value;

	logLoading(displayName, cron);

	const job = schedule.scheduleJob({ rule: cron, tz: config.TASKS_TZ }, run);

	if (!job) {
		console.error(`Failed to schedule task "${displayName}" with cron "${cron}"`);
	}
}
