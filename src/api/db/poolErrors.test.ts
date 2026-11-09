import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { logger } from '#lib/logger';
import { listenForPoolErrors } from './poolErrors';

describe('listenForPoolErrors', () => {
	it('logs an idle connection failing instead of ending the process', () => {
		const pool = new EventEmitter();
		const logged = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		const failure = new Error('Connection terminated unexpectedly');

		expect(() => pool.emit('error', failure)).toThrow(failure);

		listenForPoolErrors(pool);

		expect(() => pool.emit('error', failure)).not.toThrow();
		expect(logged).toHaveBeenCalledWith('An idle database connection failed', failure);
	});
});
