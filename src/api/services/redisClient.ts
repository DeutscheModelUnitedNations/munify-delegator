import { Redis, type RedisOptions } from 'ioredis';
import { REDIS_URL } from '$app/env/private';
import { closeOnShutdown } from './shutdown';

/**
 * A client of the app's Redis, or undefined without one (`REDIS_URL`). Closed when the server
 * shuts down: an open connection keeps the process alive.
 *
 * It quits rather than disconnects: `disconnect()` rejects every command still waiting for its
 * reply with "Connection is closed.", and the subscriptions' event target fires its `subscribe`,
 * `unsubscribe` and `publish` without awaiting them - the streams ending at shutdown unsubscribe,
 * so every redeploy reported those rejections as unhandled. `quit()` lets the replies arrive first.
 */
export function redisClient(options: RedisOptions = {}): Redis | undefined {
	if (!REDIS_URL) return undefined;
	const client = new Redis(REDIS_URL, options);
	closeOnShutdown(async () => {
		// a lazy client that never connected has nothing to wait for
		if (client.status === 'wait' || client.status === 'end') return client.disconnect();
		await client.quit().catch(() => client.disconnect());
	});
	return client;
}
