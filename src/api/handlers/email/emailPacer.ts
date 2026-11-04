import { redisClient } from '#api/services/redisClient';
import { createPacer, memorySlots, redisSlots } from './emailPacing';

/**
 * The pacer of every sweep, shared across instances through Redis when there is one. Without an
 * offline queue and with one retry, a command fails at once while Redis is away, and the slot comes
 * from memory instead of the send waiting for a reconnect.
 */
const redis = redisClient({ enableOfflineQueue: false, maxRetriesPerRequest: 1 });

export const emailPacer = createPacer({
	store: redis ? redisSlots(redis) : memorySlots(),
	fallback: memorySlots()
});
