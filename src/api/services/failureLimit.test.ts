import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Redis } from 'ioredis';
import { createAttemptLimiter, createCounter, createFailureLimiter } from './failureLimit';

class Miss extends Error {}
class Refused extends Error {}

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

const counterOf = (limit: number) => createCounter({ prefix: 'test', limit, windowSeconds: 1 });

function failureLimiter() {
	return createFailureLimiter({
		counter: counterOf(3),
		isFailure: (error) => error instanceof Miss,
		refused: () => new Refused()
	});
}

const miss = () => Promise.reject(new Miss());
const hit = () => Promise.resolve('found');

describe('createFailureLimiter', () => {
	it('refuses after the limit of failures, and only the caller who failed', async () => {
		const limiter = failureLimiter();
		for (let i = 0; i < 3; i++)
			await expect(limiter.attempt({ key: 'a', run: miss })).rejects.toThrow(Miss);
		await expect(limiter.attempt({ key: 'a', run: hit })).rejects.toThrow(Refused);
		await expect(limiter.attempt({ key: 'b', run: hit })).resolves.toBe('found');
	});

	it('counts neither successes nor other errors', async () => {
		const limiter = failureLimiter();
		const other = () => Promise.reject(new Error('conflict'));
		for (let i = 0; i < 5; i++) {
			await limiter.attempt({ key: 'a', run: hit });
			await expect(limiter.attempt({ key: 'a', run: other })).rejects.toThrow('conflict');
		}
		await expect(limiter.attempt({ key: 'a', run: hit })).resolves.toBe('found');
	});

	it('lets the caller try again once the window has passed', async () => {
		const limiter = failureLimiter();
		for (let i = 0; i < 3; i++)
			await expect(limiter.attempt({ key: 'a', run: miss })).rejects.toThrow(Miss);
		vi.advanceTimersByTime(1000);
		await expect(limiter.attempt({ key: 'a', run: hit })).resolves.toBe('found');
	});
});

describe('createAttemptLimiter', () => {
	const attemptLimiter = () =>
		createAttemptLimiter({ counter: counterOf(2), refused: () => new Refused() });

	it('counts every attempt and refuses past the limit, per caller', async () => {
		const limiter = attemptLimiter();
		await limiter.take('a');
		await limiter.take('a');
		await expect(limiter.take('a')).rejects.toThrow(Refused);
		await expect(limiter.take('b')).resolves.toBeUndefined();
	});

	it('lets the caller in again once the window has passed', async () => {
		const limiter = attemptLimiter();
		await limiter.take('a');
		await limiter.take('a');
		vi.advanceTimersByTime(1000);
		await expect(limiter.take('a')).resolves.toBeUndefined();
	});
});

describe('createCounter', () => {
	it('counts in memory while Redis cannot be reached', async () => {
		vi.useRealTimers();
		// Nothing listens on port 1, and without retries every command fails at once.
		const redis = new Redis('redis://127.0.0.1:1', {
			lazyConnect: true,
			maxRetriesPerRequest: 0,
			retryStrategy: () => null
		});
		const limiter = createAttemptLimiter({
			counter: createCounter({ redis, prefix: 'test', limit: 1, windowSeconds: 60 }),
			refused: () => new Refused()
		});
		await expect(limiter.take('a')).resolves.toBeUndefined();
		await expect(limiter.take('a')).rejects.toThrow(Refused);
		redis.disconnect();
	});
});
