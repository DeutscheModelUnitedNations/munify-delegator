import { Redis, type RedisOptions } from 'ioredis';
import { REDIS_URL } from '$app/env/private';
import { logger } from '#lib/logger';
import { closeOnShutdown, isShuttingDown } from './shutdown';

/**
 * A client of the app's Redis, or undefined without one (`REDIS_URL`). Closed when the server
 * shuts down: an open connection keeps the process alive.
 *
 * It quits rather than disconnects: `disconnect()` rejects every command still waiting for its
 * reply with "Connection is closed.", and the subscriptions' event target fires its `subscribe`,
 * `unsubscribe` and `publish` without awaiting them - the streams ending at shutdown unsubscribe,
 * so every redeploy reported those rejections as unhandled. `quit()` lets the replies arrive first.
 *
 * Connection errors are logged: without an `error` listener ioredis prints them as "Unhandled error
 * event" outside the JSON log. A stream ending at shutdown still writes its `unsubscribe` to the
 * closed socket (ECONNRESET); that is the shutdown, not an error.
 */
export function redisClient(options: RedisOptions = {}): Redis | undefined {
	if (!REDIS_URL) return undefined;
	const client = new Redis(REDIS_URL, options);
	client.on('error', (error: Error) => {
		if (!isShuttingDown()) logger.warn('Redis connection error', error);
	});
	closeOnShutdown(async () => {
		// a lazy client that never connected has nothing to wait for
		if (client.status === 'wait' || client.status === 'end') return client.disconnect();
		await client.quit().catch(() => client.disconnect());
	});
	return client;
}
