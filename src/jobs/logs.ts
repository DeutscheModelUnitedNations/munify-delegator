export function logTaskStart(taskName: string) {
	console.info(`Started Task: ${taskName}`);
	console.info('----');
	return new Date().getTime();
}

export function logTaskEnd(taskName: string, startTime?: number) {
	console.info('----');
	console.info(
		`Finished Task: ${taskName} ${startTime ? `(in ${new Date().getTime() - startTime}ms)` : ''}`
	);
}

export function taskWarning(taskName: string, message: string) {
	console.warn(`Warning in task "${taskName}" - ${message}`);
}

/** Logs the failure and makes the process exit non-zero, so the scheduler running the job sees it. */
export function taskError(taskName: string, message: string, error?: string | Error) {
	process.exitCode = 1;
	console.error(`Error in task "${taskName}" - ${message}`, error ?? '');
}
