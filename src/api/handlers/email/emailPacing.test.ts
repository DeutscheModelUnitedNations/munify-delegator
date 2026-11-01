import { describe, expect, test } from 'vitest';
import { Redis } from 'ioredis';
import { createPacer, memorySlots, redisSlots, roundLimit, type SlotStore } from './emailPacing';

function fakeClock() {
	let time = 1_000;
	const sleeps: number[] = [];
	return {
		sleeps,
		now: () => time,
		advance: (ms: number) => {
			time += ms;
		},
		sleep: async (ms: number) => {
			sleeps.push(ms);
			time += ms;
		}
	};
}

function pacerWithClock() {
	const clock = fakeClock();
	return { clock, pacer: createPacer({ store: memorySlots(clock), sleep: clock.sleep }) };
}

describe('createPacer', () => {
	test('spaces sends 1000 / perSecond ms apart', async () => {
		const { clock, pacer } = pacerWithClock();
		for (let i = 0; i < 4; i++) await pacer.wait({ key: 'c', perSecond: 4 });
		expect(clock.sleeps).toEqual([250, 250, 250]);
	});

	test('does not wait when sending itself took longer than the gap', async () => {
		const { clock, pacer } = pacerWithClock();
		await pacer.wait({ key: 'c', perSecond: 2 });
		clock.advance(800); // a slow send
		await pacer.wait({ key: 'c', perSecond: 2 });
		expect(clock.sleeps).toEqual([]);
	});

	test('shares the slots between sweeps waiting side by side, per conference', async () => {
		const clock = fakeClock();
		const sleeps: number[] = [];
		const pacer = createPacer({
			store: memorySlots(clock),
			sleep: async (ms) => void sleeps.push(ms)
		});
		await Promise.all([
			pacer.wait({ key: 'a', perSecond: 10 }),
			pacer.wait({ key: 'a', perSecond: 10 }),
			pacer.wait({ key: 'a', perSecond: 10 }),
			pacer.wait({ key: 'b', perSecond: 10 })
		]);
		expect(sleeps).toEqual([100, 200]);
	});

	test('never waits without a limit', async () => {
		const { clock, pacer } = pacerWithClock();
		for (let i = 0; i < 5; i++) await pacer.wait({ key: 'c', perSecond: null });
		expect(clock.sleeps).toEqual([]);
	});

	test('takes the slot from the fallback when the store fails', async () => {
		const clock = fakeClock();
		const failing: SlotStore = () => Promise.reject(new Error('down'));
		const pacer = createPacer({
			store: failing,
			fallback: memorySlots(clock),
			sleep: clock.sleep
		});
		await pacer.wait({ key: 'c', perSecond: 5 });
		await pacer.wait({ key: 'c', perSecond: 5 });
		expect(clock.sleeps).toEqual([200]);
	});
});

describe('redisSlots', () => {
	test('fails at once while Redis cannot be reached, so the fallback steps in', async () => {
		// Nothing listens on port 1, and without retries every command fails at once.
		const redis = new Redis('redis://127.0.0.1:1', {
			enableOfflineQueue: false,
			maxRetriesPerRequest: 0,
			retryStrategy: () => null
		});
		redis.on('error', () => {});
		const pacer = createPacer({ store: redisSlots(redis), fallback: memorySlots() });
		await expect(pacer.wait({ key: 'c', perSecond: 1000 })).resolves.toBeUndefined();
		redis.disconnect();
	});
});

describe('roundLimit', () => {
	test('keeps a paced round to a minute', () => {
		expect(roundLimit({ limit: 300, perSecond: 2 })).toBe(120);
		expect(roundLimit({ limit: 300, perSecond: 10 })).toBe(300);
		expect(roundLimit({ limit: 300, perSecond: null })).toBe(300);
	});
});
