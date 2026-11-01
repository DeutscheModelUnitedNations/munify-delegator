import { Redis } from 'ioredis';
import { REDIS_URL } from '$app/env/private';
import { createPacer, memorySlots, redisSlots } from './emailPacing';

/**
 * The pacer of every sweep, shared across instances through Redis when there is one. Without an
 * offline queue and with one retry, a command fails at once while Redis is away, and the slot comes
 * from memory instead of the send waiting for a reconnect.
 */
export const emailPacer = createPacer({
	store: REDIS_URL
		? redisSlots(new Redis(REDIS_URL, { enableOfflineQueue: false, maxRetriesPerRequest: 1 }))
		: memorySlots(),
	fallback: memorySlots()
});
