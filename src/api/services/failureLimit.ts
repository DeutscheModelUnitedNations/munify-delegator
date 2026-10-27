/**
 * Counting attempts per caller and refusing once there are too many: failed ones for lookups by a
 * short code, where every miss is a guess (`createFailureLimiter`), every one for work that is
 * expensive whether it succeeds or not (`createAttemptLimiter`).
 *
 * Only failures count, so somebody who types their code right never notices the limit. The
 * counters are short-lived and never touch the database: in Redis each key is created with its
 * expiry in the same transaction (`SET … PX … NX` before `INCR`), so no key outlives its window
 * even if the process dies between the two; in memory, expired entries are dropped as new ones
 * come in.
 */

/** Where the failures of each key are counted, for `windowMs` from the first one. */
export interface FailureStore {
	count(key: string): Promise<number>;
	add(key: string, windowMs: number): Promise<void>;
}

/** The part of an ioredis client the Redis store uses. */
export interface RedisCommands {
	get(key: string): Promise<string | null>;
	multi(): {
		set(key: string, value: string, px: 'PX', ms: number, nx: 'NX'): unknown;
		incr(key: string): unknown;
		exec(): Promise<unknown>;
	};
}

/** Counters shared by every instance of the app. */
export function createRedisFailureStore(redis: RedisCommands, prefix: string): FailureStore {
	return {
		async count(key) {
			return Number((await redis.get(prefix + key)) ?? 0);
		},
		async add(key, windowMs) {
			const multi = redis.multi();
			multi.set(prefix + key, '0', 'PX', windowMs, 'NX');
			multi.incr(prefix + key);
			await multi.exec();
		}
	};
}

/** How often the in-memory store looks for expired entries, at most. */
const PRUNE_INTERVAL_MS = 60_000;

/** Counters of this process only, for a single instance or when there is no Redis. */
export function createMemoryFailureStore(now: () => number = Date.now) {
	const entries = new Map<string, { count: number; expiresAt: number }>();
	let nextPrune = 0;

	function prune(at: number) {
		if (at < nextPrune) return;
		nextPrune = at + PRUNE_INTERVAL_MS;
		for (const [key, entry] of entries) {
			if (entry.expiresAt <= at) entries.delete(key);
		}
	}

	function live(key: string, at: number) {
		const entry = entries.get(key);
		return entry && entry.expiresAt > at ? entry : undefined;
	}

	const store = {
		async count(key: string) {
			return live(key, now())?.count ?? 0;
		},
		async add(key: string, windowMs: number) {
			const at = now();
			prune(at);
			const entry = live(key, at);
			if (entry) entry.count++;
			else entries.set(key, { count: 1, expiresAt: at + windowMs });
		},
		/** How many keys are held; for tests. */
		get size() {
			return entries.size;
		}
	};
	return store satisfies FailureStore;
}

/**
 * Refuses a caller with `limit` failures in the last window, and counts an attempt as a failure
 * when it throws something `isFailure` recognises. `refused` builds the error thrown when the limit
 * is reached.
 */
export function createFailureLimiter(options: {
	store: FailureStore;
	limit: number;
	windowMs: number;
	isFailure: (error: unknown) => boolean;
	refused: () => Error;
}) {
	return {
		async attempt<T>(key: string, run: () => Promise<T>): Promise<T> {
			if ((await options.store.count(key)) >= options.limit) throw options.refused();
			try {
				return await run();
			} catch (error) {
				if (options.isFailure(error)) await options.store.add(key, options.windowMs);
				throw error;
			}
		}
	};
}

/**
 * Refuses a caller who made `limit` attempts in the last window, counting every attempt rather
 * than only failures. Counting and refusing are two steps, so a few requests arriving at the same
 * moment may pass together; a cap on concurrent work belongs next to it.
 */
export function createAttemptLimiter(options: {
	store: FailureStore;
	limit: number;
	windowMs: number;
	refused: () => Error;
}) {
	return {
		async take(key: string) {
			if ((await options.store.count(key)) >= options.limit) throw options.refused();
			await options.store.add(key, options.windowMs);
		}
	};
}
