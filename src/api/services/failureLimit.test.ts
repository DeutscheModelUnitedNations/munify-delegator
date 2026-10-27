import { describe, expect, it } from 'vitest';
import {
	createAttemptLimiter,
	createFailureLimiter,
	createMemoryFailureStore,
	createRedisFailureStore,
	type RedisCommands
} from './failureLimit';

class Miss extends Error {}
class Refused extends Error {}

function limiterAt(clock: { now: number }) {
	const store = createMemoryFailureStore(() => clock.now);
	const limiter = createFailureLimiter({
		store,
		limit: 3,
		windowMs: 1000,
		isFailure: (error) => error instanceof Miss,
		refused: () => new Refused()
	});
	return { store, limiter };
}

const miss = () => Promise.reject(new Miss());
const hit = () => Promise.resolve('found');

describe('createFailureLimiter', () => {
	it('refuses after the limit of failures, and only the caller who failed', async () => {
		const { limiter } = limiterAt({ now: 0 });
		for (let i = 0; i < 3; i++) await expect(limiter.attempt('a', miss)).rejects.toThrow(Miss);
		await expect(limiter.attempt('a', hit)).rejects.toThrow(Refused);
		await expect(limiter.attempt('b', hit)).resolves.toBe('found');
	});

	it('counts neither successes nor other errors', async () => {
		const { limiter } = limiterAt({ now: 0 });
		const other = () => Promise.reject(new Error('conflict'));
		for (let i = 0; i < 5; i++) {
			await limiter.attempt('a', hit);
			await expect(limiter.attempt('a', other)).rejects.toThrow('conflict');
		}
		await expect(limiter.attempt('a', hit)).resolves.toBe('found');
	});

	it('lets the caller try again once the window has passed', async () => {
		const clock = { now: 0 };
		const { limiter } = limiterAt(clock);
		for (let i = 0; i < 3; i++) await expect(limiter.attempt('a', miss)).rejects.toThrow(Miss);
		clock.now = 1000;
		await expect(limiter.attempt('a', hit)).resolves.toBe('found');
	});
});

describe('createMemoryFailureStore', () => {
	it('drops expired entries instead of keeping every key it ever saw', async () => {
		const clock = { now: 0 };
		const store = createMemoryFailureStore(() => clock.now);
		for (let i = 0; i < 50; i++) await store.add(`key${i}`, 1000);
		expect(store.size).toBe(50);
		clock.now = 120_000;
		await store.add('fresh', 1000);
		expect(store.size).toBe(1);
	});
});

describe('createRedisFailureStore', () => {
	it('creates the key with its expiry before counting, in one transaction', async () => {
		const calls: unknown[][] = [];
		const redis: RedisCommands = {
			get: async () => '2',
			multi: () => ({
				set: (...args) => calls.push(['set', ...args]),
				incr: (...args) => calls.push(['incr', ...args]),
				exec: async () => calls.push(['exec'])
			})
		};
		const store = createRedisFailureStore(redis, 'p:');
		await store.add('a', 600_000);
		expect(calls).toEqual([['set', 'p:a', '0', 'PX', 600_000, 'NX'], ['incr', 'p:a'], ['exec']]);
		expect(await store.count('a')).toBe(2);
	});
});

describe('createAttemptLimiter', () => {
	function attemptLimiterAt(clock: { now: number }) {
		return createAttemptLimiter({
			store: createMemoryFailureStore(() => clock.now),
			limit: 2,
			windowMs: 1000,
			refused: () => new Refused()
		});
	}

	it('counts every attempt and refuses past the limit, per caller', async () => {
		const limiter = attemptLimiterAt({ now: 0 });
		await limiter.take('a');
		await limiter.take('a');
		await expect(limiter.take('a')).rejects.toThrow(Refused);
		await expect(limiter.take('b')).resolves.toBeUndefined();
	});

	it('lets the caller in again once the window has passed', async () => {
		const clock = { now: 0 };
		const limiter = attemptLimiterAt(clock);
		await limiter.take('a');
		await limiter.take('a');
		clock.now = 1000;
		await expect(limiter.take('a')).resolves.toBeUndefined();
	});
});
