import schedule from 'node-schedule';
import { Command } from 'commander';
import { argv } from 'process';
import { logLoading } from '../logs';
import { config } from '../config';
import { runMailSync } from './orchestrator';

const TASK_NAME = 'Mail Service: Sync with Listmonk';
const CRON = '0 */15 * * * *';

const program = new Command();

program.option('--run-once', 'Run the mail sync task once immediately');
program.parse(argv);

const options = program.opts();

if (options.runOnce) {
	console.info(`Running ${TASK_NAME} once immediately`);
	await runMailSync();
} else {
	logLoading(TASK_NAME, CRON);
	const _ = schedule.scheduleJob({ rule: CRON, tz: config.TASKS_TZ }, runMailSync);
}
