export function logLoading(taskName: string, schedule: string) {
	console.info(`Loading Task: ${taskName}`);
	console.info(`    -> Schedule: ${schedule}`);
}

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
	console.warn(`Warning: ${taskName} - ${message}`);
}
