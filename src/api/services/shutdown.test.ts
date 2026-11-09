import { describe, expect, test, vi } from 'vitest';
import { logger } from '#lib/logger';
import { closeAll, closeOnShutdown } from './shutdown';

describe('closeAll', () => {
	test('closes every registered connection, logs a failed close, and stops waiting for a hanging one', async () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
		const closed = vi.fn(async () => {});
		closeOnShutdown(closed);
		closeOnShutdown(async () => {
			throw new Error('already gone');
		});
		closeOnShutdown(() => new Promise(() => {}));

		const started = Date.now();
		await closeAll(50);

		expect(closed).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith('Closing a connection failed', expect.any(Error));
		expect(Date.now() - started).toBeLessThan(1000);
		warn.mockRestore();
	});
});
