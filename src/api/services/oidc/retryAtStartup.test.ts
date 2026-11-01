import { describe, expect, test, vi } from 'vitest';
import { retryAtStartup } from './retryAtStartup';

const noWait = () => Promise.resolve();

describe('retryAtStartup', () => {
	test('answers what the first successful attempt does, after the failed ones', async () => {
		const attempt = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new Error('503'))
			.mockRejectedValueOnce(new Error('503'))
			.mockResolvedValue('discovered');
		const onRetry = vi.fn();
		await expect(retryAtStartup({ attempt, onRetry, sleep: noWait })).resolves.toBe('discovered');
		expect(attempt).toHaveBeenCalledTimes(3);
		expect(onRetry.mock.calls.map(([failure]) => failure.attemptsLeft)).toEqual([9, 8]);
	});

	test('waits between attempts', async () => {
		const sleep = vi.fn(noWait);
		const attempt = vi.fn<() => Promise<number>>().mockRejectedValueOnce(new Error('down'));
		attempt.mockResolvedValue(1);
		await retryAtStartup({ attempt, delayMs: 250, sleep });
		expect(sleep).toHaveBeenCalledWith(250);
	});

	test('gives up after the last attempt with its error', async () => {
		const attempt = vi.fn(() => Promise.reject(new Error('still down')));
		await expect(retryAtStartup({ attempt, attempts: 3, sleep: noWait })).rejects.toThrow(
			'still down'
		);
		expect(attempt).toHaveBeenCalledTimes(3);
	});
});
