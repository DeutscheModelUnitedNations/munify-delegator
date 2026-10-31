import { logger } from '#lib/logger';

export function logTaskStart(taskName: string) {
	logger.info('Task started', { task: taskName });
	return Date.now();
}

export function logTaskEnd({ taskName, startTime }: { taskName: string; startTime?: number }) {
	logger.info('Task finished', {
		task: taskName,
		durationMs: startTime ? Date.now() - startTime : undefined
	});
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
