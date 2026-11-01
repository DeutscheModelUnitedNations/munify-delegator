import type { Redis } from 'ioredis';

/**
 * Keeps a conference's sweeps under its `emailsPerSecond`. Each send reserves the conference's next
 * free slot, `1000 / perSecond` ms after the one before, and waits for it. The slots live in Redis
 * when there is one, so every sweep on every instance shares them; in this process's memory
 * otherwise, and while Redis cannot be reached.
 */

/** Reserves the next free slot under `key`; answers how many ms from now it starts. */
export type SlotStore = (args: { key: string; intervalMs: number }) => Promise<number>;

/** Slots in this process's memory. */
export function memorySlots({ now = () => Date.now() }: { now?: () => number } = {}): SlotStore {
	const nextFree = new Map<string, number>();
	return async ({ key, intervalMs }) => {
		const current = now();
		const slot = Math.max(current, nextFree.get(key) ?? 0);
		nextFree.set(key, slot + intervalMs);
		return slot - current;
	};
}

/**
 * Reads the next free slot, moves it on by the interval and answers the wait, in one step, on
 * Redis's clock, so instances with clocks apart still keep the spacing. The key expires once its
 * slot has passed.
 */
const RESERVE_SLOT = `
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local slot = math.max(now, tonumber(redis.call('GET', KEYS[1]) or '0'))
local nextFree = slot + tonumber(ARGV[1])
redis.call('SET', KEYS[1], tostring(nextFree), 'PX', math.ceil(nextFree - now) + 1000)
return math.ceil(slot - now)
`;

/** Slots in Redis, under `email-pace:<key>`. */
export function redisSlots(redis: Redis): SlotStore {
	return async ({ key, intervalMs }) =>
		Number(await redis.eval(RESERVE_SLOT, 1, `email-pace:${key}`, String(intervalMs)));
}

/**
 * Waits for the caller's slot; without a limit it resolves at once and reserves nothing. When
 * `store` fails, `fallback` hands out the slot instead.
 */
export function createPacer({
	store,
	fallback,
	sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
}: {
	store: SlotStore;
	fallback?: SlotStore;
	sleep?: (ms: number) => Promise<void>;
}) {
	async function reserve(args: { key: string; intervalMs: number }) {
		if (!fallback) return store(args);
		try {
			return await store(args);
		} catch {
			return fallback(args);
		}
	}
	return {
		async wait({ key, perSecond }: { key: string; perSecond: number | null }) {
			if (!perSecond) return;
			const ms = await reserve({ key, intervalMs: 1000 / perSecond });
			if (ms > 0) await sleep(ms);
		}
	};
}

/** The longest a paced sweep round may take, so one call of the job never runs for long. */
const MAX_ROUND_SECONDS = 60;

/** How many mails one round sends at most: `limit`, or fewer when the pace would take too long. */
export function roundLimit({ limit, perSecond }: { limit: number; perSecond: number | null }) {
	return perSecond ? Math.min(limit, perSecond * MAX_ROUND_SECONDS) : limit;
}
