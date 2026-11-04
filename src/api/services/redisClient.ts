import { Redis, type RedisOptions } from 'ioredis';
import { REDIS_URL } from '$app/env/private';
import { closeOnShutdown } from './shutdown';

/**
 * A client of the app's Redis, or undefined without one (`REDIS_URL`). Closed when the server
 * shuts down: an open connection keeps the process alive.
 */
export function redisClient(options: RedisOptions = {}): Redis | undefined {
	if (!REDIS_URL) return undefined;
	const client = new Redis(REDIS_URL, options);
	closeOnShutdown(async () => client.disconnect());
	return client;
}
