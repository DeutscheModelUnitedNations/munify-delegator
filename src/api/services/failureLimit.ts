import {
	RateLimiterMemory,
	RateLimiterRedis,
	RateLimiterRes,
	type RateLimiterAbstract
} from 'rate-limiter-flexible';
import type { Redis } from 'ioredis';

/**
 * Counting attempts per caller and refusing once there are too many: failed ones for lookups by a
 * short code, where every miss is a guess (`createFailureLimiter`), every one for work that is
 * expensive whether it succeeds or not (`createAttemptLimiter`). The counting is
 * rate-limiter-flexible's; the counters expire with their window and never touch the database.
 */

/**
 * `limit` per key in a window of `windowSeconds` from the key's first count. In Redis when there
 * is one, so every instance shares the counters, falling back to this process's memory while Redis
 * cannot be reached rather than failing the request.
 */
export function createCounter({
	redis,
	prefix,
	limit,
	windowSeconds
}: {
	redis?: Redis;
	prefix: string;
	limit: number;
	windowSeconds: number;
}): RateLimiterAbstract {
	const options = { keyPrefix: prefix, points: limit, duration: windowSeconds };
	const memory = new RateLimiterMemory(options);
	if (!redis) return memory;
	return new RateLimiterRedis({ ...options, storeClient: redis, insuranceLimiter: memory });
}

/**
 * Refuses a caller with `limit` failures in the last window, and counts an attempt as a failure
 * when it throws something `isFailure` recognises. `refused` builds the error thrown when the limit
 * is reached. Checking and counting are two steps, so a few misses at the same moment may all
 * count; that only lets through a guess or two more.
 */
export function createFailureLimiter(options: {
	counter: RateLimiterAbstract;
	isFailure: (error: unknown) => boolean;
	refused: () => Error;
}) {
	const { counter } = options;
	return {
		async attempt<T>({ key, run }: { key: string; run: () => Promise<T> }): Promise<T> {
			const counted = await counter.get(key);
			if ((counted?.consumedPoints ?? 0) >= counter.points) throw options.refused();
			try {
				return await run();
			} catch (error) {
				if (options.isFailure(error)) await counter.penalty(key);
				throw error;
			}
		}
	};
}

/** Refuses a caller who made `limit` attempts in the last window, counting every attempt. */
export function createAttemptLimiter(options: {
	counter: RateLimiterAbstract;
	refused: () => Error;
}) {
	return {
		async take(key: string) {
			try {
				await options.counter.consume(key);
			} catch (error) {
				// The limiter rejects with its result, not an Error, when the key is over its limit.
				if (error instanceof RateLimiterRes) throw options.refused();
				throw error;
			}
		}
	};
}
