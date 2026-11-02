import { logger } from '#lib/logger';

/**
 * The pool re-emits an error of an idle connection (the database restarting, a proxy dropping the
 * socket) as its own `error` event, and an `error` event nobody listens to ends the process. The
 * pool drops the broken connection by itself and opens a new one on the next query.
 */
export function listenForPoolErrors(pool: {
	on(event: 'error', listener: (error: Error) => void): unknown;
}) {
	pool.on('error', (error) => logger.error('An idle database connection failed', error));
}
