import { describe, expect, test, vi } from 'vitest';
import { logger } from '#lib/logger';
import { beforeShutdown, closeAll, closeOnShutdown, isShuttingDown } from './shutdown';

describe('closeAll', () => {
	test('closes every registered connection, logs a failed close, and stops waiting for a hanging one', async () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
		const closed = vi.fn(async () => {});
		closeOnShutdown(closed);
		closeOnShutdown(async () => {
			throw new Error('already gone');
		});
		closeOnShutdown(() => new Promise(() => {}));

		const order: string[] = [];
		beforeShutdown(async () => {
			await Promise.resolve();
			order.push(closed.mock.calls.length === 0 ? 'work before closing' : 'work after closing');
		});

		const started = Date.now();
		expect(isShuttingDown()).toBe(false);
		await closeAll(50);
		expect(isShuttingDown()).toBe(true);

		expect(closed).toHaveBeenCalledOnce();
		expect(order).toEqual(['work before closing']);
		expect(warn).toHaveBeenCalledWith('Closing a connection failed', expect.any(Error));
		expect(Date.now() - started).toBeLessThan(1000);
		warn.mockRestore();
	});
});
