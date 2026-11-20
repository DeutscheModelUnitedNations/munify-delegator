import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { logger } from '#lib/logger';

vi.mock('$app/env/private', () => ({ REDIS_URL: 'redis://localhost:6379' }));
vi.mock('ioredis', () => ({
	Redis: class extends EventEmitter {
		status = 'wait';
		disconnect() {}
	}
}));

import { redisClient } from './redisClient';
import { closeAll } from './shutdown';

describe('redisClient', () => {
	it('logs connection errors, which ioredis would print as unhandled, and not at shutdown', async () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
		const client = redisClient();
		const reset = new Error('write ECONNRESET');

		client?.emit('error', reset);
		expect(warn).toHaveBeenCalledWith('Redis connection error', reset);

		await closeAll(50);
		warn.mockClear();
		client?.emit('error', reset);
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});
