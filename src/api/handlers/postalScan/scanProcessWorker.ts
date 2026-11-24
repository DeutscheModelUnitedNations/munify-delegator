/** What the processes of `./scanProcess` share: they run on their own, without the app. */

/** Resident memory after which a process hands over to a new one: a few pages at 300 dpi. */
const MEMORY_BUDGET = 600_000_000;

export const tookTooMuch = () => process.memoryUsage.rss() > MEMORY_BUDGET;

/** Says something, and waits until it is out. */
export const say = (message: object) =>
	new Promise<void>((said, failed) =>
		process.send?.(message, undefined, undefined, (error) => (error ? failed(error) : said()))
	);

/** Runs until `work` is done; what it throws ends the process, which its owner is told by that. */
export function runProcess(work: () => Promise<void>) {
	// the app is gone: nobody waits for the rest
	process.on('disconnect', () => process.exit());
	work().then(
		() => process.exit(0),
		(error: unknown) => {
			process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
			process.exit(1);
		}
	);
}

/** What it is told, one by one. */
export function createInbox<I extends object>() {
	const told: I[] = [];
	const waiting: ((message: I) => void)[] = [];
	process.on('message', (message: I) => {
		const next = waiting.shift();
		if (next) next(message);
		else told.push(message);
	});
	return (): Promise<I> => {
		const message = told.shift();
		return message ? Promise.resolve(message) : new Promise((next) => waiting.push(next));
	};
}
