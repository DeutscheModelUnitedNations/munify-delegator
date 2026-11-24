// @vitest-environment node
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createScanProcess, ProcessEndedError } from './scanProcess';

const { fork } = vi.hoisted(() => ({ fork: vi.fn() }));
vi.mock('node:child_process', () => ({ fork }));
vi.mock('$app/env', () => ({ dev: false }));
vi.mock('./scanSandbox', () => ({
	sandboxCommand: (nodeArgs: string[]) => ({ execPath: 'sandbox', execArgv: ['node', ...nodeArgs] })
}));

function start() {
	const child = Object.assign(new EventEmitter(), {
		connected: true,
		send: vi.fn(),
		kill: vi.fn(() => child.emit('exit'))
	});
	fork.mockReturnValueOnce(child);
	return { child, process: createScanProcess<{ ask: number }, { answer: number }>('scanReader') };
}

beforeEach(() => vi.resetAllMocks());

describe('createScanProcess', () => {
	test('hears what it says one by one, whether or not somebody waits yet', async () => {
		const { child, process } = start();
		child.emit('message', { answer: 1 });
		child.emit('message', { answer: 2 });
		expect([await process.next(), await process.next()]).toEqual([{ answer: 1 }, { answer: 2 }]);
		const waiting = process.next();
		child.emit('message', { answer: 3 });
		expect(await waiting).toEqual({ answer: 3 });
	});

	test('gives it nothing of the app’s environment, and bytes as they are', () => {
		vi.stubEnv('CERTIFICATE_SECRET', 'secret');
		start();
		const [file, , options] = fork.mock.calls[0];
		expect(file).toMatch(/build\/compute\/scanReader\.mjs$/);
		expect(Object.keys(options.env)).toEqual(['NODE_ENV']);
		expect(options.serialization).toBe('advanced');
		expect(options.execPath).toBe('sandbox');
		expect(options.execArgv).toEqual(['node', expect.stringMatching(/^--max-old-space-size=/)]);
		vi.unstubAllEnvs();
	});

	test('says when it ended before it answered, then and later', async () => {
		const { child, process } = start();
		const waiting = expect(process.next()).rejects.toBeInstanceOf(ProcessEndedError);
		child.emit('exit');
		await waiting;
		await expect(process.next()).rejects.toBeInstanceOf(ProcessEndedError);
		process.tell({ ask: 1 });
		expect(child.send).not.toHaveBeenCalled();
	});

	test('ends one that says nothing any more', async () => {
		vi.useFakeTimers();
		const { child, process } = start();
		const waiting = expect(process.next()).rejects.toBeInstanceOf(ProcessEndedError);
		await vi.advanceTimersByTimeAsync(60_001);
		await waiting;
		expect(child.kill).toHaveBeenCalledWith('SIGKILL');
		vi.useRealTimers();
	});
});
