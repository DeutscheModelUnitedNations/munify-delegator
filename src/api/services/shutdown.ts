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

/** Closes a connection when the server shuts down. */
export function closeOnShutdown(close: () => Promise<unknown>) {
	closers.push(close);
}

/** Closes everything registered, waiting at most `timeoutMs`. */
export async function closeAll(timeoutMs = CLOSE_TIMEOUT_MS) {
	const closed = Promise.all(
		closers.map((close) =>
			close().catch((error: unknown) => logger.warn('Closing a connection failed', error))
		)
	);
	await Promise.race([closed, new Promise((done) => setTimeout(done, timeoutMs).unref())]);
}

process.once('sveltekit:shutdown', async () => {
	await closeAll();
	process.exit(0);
});
