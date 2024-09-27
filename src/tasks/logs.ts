export function logLoading(taskName: string, schedule: string) {
	console.info(`   Loaded: ${taskName}`);
	console.info(`     -> Schedule: ${schedule}`);
}

export function logTaskStart(taskName: string) {
	console.info(`Started Task: ${taskName}`);
	console.info('----');
}

export function logTaskEnd(taskName: string) {
	console.info('----');
	console.info(`Finished Task: ${taskName}`);
}

export function taskWarning(taskName: string, message: string) {
	console.warn(`Warning: ${taskName} - ${message}`);
}
