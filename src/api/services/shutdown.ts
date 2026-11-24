import { logger } from '#lib/logger';

/**
 * Ends the process once adapter-node has shut the HTTP server down (`sveltekit:shutdown`, after a
 * SIGTERM). Node only exits by itself when nothing keeps it busy, and the database pool and the
 * Redis clients would: the Redis connections for as long as they live, so the container was
 * killed at the end of its stop grace period instead of exiting.
 *
 * Every long-lived connection registers how it is closed; they get a moment to close, then the
 * process exits regardless.
 */
const CLOSE_TIMEOUT_MS = 2000;

const closers: Array<() => Promise<unknown>> = [];
const lastWork: Array<() => Promise<unknown>> = [];
let shuttingDown = false;

/**
 * Whether the connections are being closed. Work still running then fails on a closed pool or
 * Redis client; that is the shutdown, not an error to report.
 */
export function isShuttingDown() {
	return shuttingDown;
}

/** Closes a connection when the server shuts down. */
export function closeOnShutdown(close: () => Promise<unknown>) {
	closers.push(close);
}

/** Does something while the connections are still open, before any is closed. */
export function beforeShutdown(work: () => Promise<unknown>) {
	lastWork.push(work);
}

const runAll = (tasks: readonly (() => Promise<unknown>)[], failure: string) =>
	Promise.all(tasks.map((task) => task().catch((error: unknown) => logger.warn(failure, error))));

/** Does the last work, then closes everything registered, waiting at most `timeoutMs`. */
export async function closeAll(timeoutMs = CLOSE_TIMEOUT_MS) {
	shuttingDown = true;
	const closed = runAll(lastWork, 'The last work before the shutdown failed').then(() =>
		runAll(closers, 'Closing a connection failed')
	);
	await Promise.race([closed, new Promise((done) => setTimeout(done, timeoutMs).unref())]);
}

process.once('sveltekit:shutdown', async () => {
	await closeAll();
	process.exit(0);
});
