import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const schedule = vi.hoisted(() => {
	const state: { value?: string; scheduleJob: ReturnType<typeof vi.fn> } = { scheduleJob: vi.fn() };
	return state;
});

vi.mock('./config', () => ({
	TASK_CRON_DEFAULTS: { MAIL_SYNC: '0 */15 * * * *', CONFERENCE_STATUS: '0 0 9,20 * * *' },
	config: { TASKS_TZ: 'Europe/Berlin' },
	getTaskSchedule: () => schedule.value
}));
vi.mock('node-schedule', () => ({ default: { scheduleJob: schedule.scheduleJob } }));
vi.mock('./logs', () => ({ logLoading: vi.fn() }));

const { registerTask } = await import('./registry');

describe('registerTask', () => {
	const run = vi.fn(async () => {});

	beforeEach(() => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		schedule.scheduleJob.mockReturnValue({});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		run.mockClear();
		schedule.scheduleJob.mockReset();
	});

	test('leaves a task without a schedule disabled', async () => {
		schedule.value = undefined;
		await registerTask('MAIL_SYNC', 'Mail', run);
		expect(run).not.toHaveBeenCalled();
		expect(schedule.scheduleJob).not.toHaveBeenCalled();
		expect(console.info).toHaveBeenCalledWith(
			'Task "Mail" is disabled (TASK_CRON_MAIL_SYNC not set)'
		);
	});

	test('runs a task scheduled "once" right away, without scheduling it', async () => {
		schedule.value = 'once';
		await registerTask('MAIL_SYNC', 'Mail', run);
		expect(run).toHaveBeenCalledOnce();
		expect(schedule.scheduleJob).not.toHaveBeenCalled();
	});

	test('schedules "default" with the task default cron in the configured time zone', async () => {
		schedule.value = 'default';
		await registerTask('CONFERENCE_STATUS', 'Status', run);
		expect(schedule.scheduleJob).toHaveBeenCalledWith(
			{ rule: '0 0 9,20 * * *', tz: 'Europe/Berlin' },
			run
		);
		expect(run).not.toHaveBeenCalled();
	});

	test('schedules a custom cron as given', async () => {
		schedule.value = '0 0 * * * *';
		await registerTask('MAIL_SYNC', 'Mail', run);
		expect(schedule.scheduleJob).toHaveBeenCalledWith(
			{ rule: '0 0 * * * *', tz: 'Europe/Berlin' },
			run
		);
		expect(console.error).not.toHaveBeenCalled();
	});

	test('reports a cron node-schedule rejects', async () => {
		schedule.value = 'not a cron';
		schedule.scheduleJob.mockReturnValue(null);
		await registerTask('MAIL_SYNC', 'Mail', run);
		expect(console.error).toHaveBeenCalledWith(
			'Failed to schedule task "Mail" with cron "not a cron"'
		);
	});
});
