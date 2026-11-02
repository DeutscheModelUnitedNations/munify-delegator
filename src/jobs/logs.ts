import { logger } from '#lib/logger';

/**
 * Runs one job of the CLI and ends the process: logs its start, its end with the time it took and
 * the exit code, or its failure, which exits with 1. A job that fails without throwing sets
 * `process.exitCode` (`taskError`), and the process exits with that.
 *
 * Jobs log at `info` unless `LOG_LEVEL` says otherwise: a run's lines (what it deleted, sent,
 * refreshed) are what the scheduler's log is for, and the app's default of `warn` drops them all.
 */
export async function runJob({ job, run }: { job: string; run: () => Promise<void> }) {
	if (!process.env.LOG_LEVEL) logger.setLevel('info');
	const jobLogger = logger.child({ job });
	const startTime = Date.now();
	jobLogger.info('Job started');
	try {
		await run();
	} catch (error) {
		jobLogger.error('Job failed', { err: error, durationMs: Date.now() - startTime });
		process.exit(1);
	}
	const exitCode = process.exitCode ?? 0;
	const finished = { durationMs: Date.now() - startTime, exitCode };
	if (exitCode === 0) jobLogger.info('Job finished', finished);
	else jobLogger.warn('Job finished with errors', finished);
	process.exit();
}

export function taskWarning({ taskName, message }: { taskName: string; message: string }) {
	logger.warn(message, { task: taskName });
}

/** Logs the failure and makes the process exit non-zero, so the scheduler running the job sees it. */
export function taskError({
	taskName,
	message,
	error
}: {
	taskName: string;
	message: string;
	error?: string | Error;
}) {
	process.exitCode = 1;
	logger.error(message, { task: taskName, err: error });
}
