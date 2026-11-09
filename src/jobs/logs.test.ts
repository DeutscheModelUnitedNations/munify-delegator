import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { logger } from '#lib/logger';
import { runJob } from './logs';

const lines = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

vi.mock('#lib/logger', () => ({
	logger: { child: vi.fn(() => lines), setLevel: vi.fn() }
}));

describe('runJob', () => {
	beforeEach(() => {
		vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
	});

	afterEach(() => {
		process.exitCode = undefined;
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	test('logs at info unless LOG_LEVEL is set', async () => {
		vi.stubEnv('LOG_LEVEL', '');
		await runJob({ job: 'file-cleanup', run: async () => {} });
		expect(logger.setLevel).toHaveBeenCalledWith('info');

		vi.clearAllMocks();
		vi.stubEnv('LOG_LEVEL', 'warn');
		await runJob({ job: 'file-cleanup', run: async () => {} });
		expect(logger.setLevel).not.toHaveBeenCalled();
		vi.unstubAllEnvs();
	});

	test('logs the start and the end under the job name, then exits', async () => {
		await runJob({ job: 'file-cleanup', run: async () => {} });
		expect(logger.child).toHaveBeenCalledWith({ job: 'file-cleanup' });
		expect(lines.info).toHaveBeenCalledWith('Job started');
		expect(lines.info).toHaveBeenCalledWith('Job finished', {
			durationMs: expect.any(Number),
			exitCode: 0
		});
		expect(process.exit).toHaveBeenCalledWith();
	});

	test('logs a thrown failure and exits with 1', async () => {
		const error = new Error('database gone');
		await runJob({
			job: 'send-emails',
			run: async () => {
				throw error;
			}
		});
		expect(lines.error).toHaveBeenCalledWith('Job failed', {
			err: error,
			durationMs: expect.any(Number)
		});
		expect(process.exit).toHaveBeenCalledWith(1);
	});

	test('warns when the job failed through the exit code', async () => {
		await runJob({
			job: 'mail-sync',
			run: async () => {
				process.exitCode = 1;
			}
		});
		expect(lines.warn).toHaveBeenCalledWith('Job finished with errors', {
			durationMs: expect.any(Number),
			exitCode: 1
		});
		expect(process.exit).toHaveBeenCalledWith();
	});
});
