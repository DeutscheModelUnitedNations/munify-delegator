// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

type Done = (error: Error | null, stdout: string, stderr: string) => void;
type Test = (file: string, args: string[], options: object, done: Done) => void;

const { execFile, env } = vi.hoisted(() => ({
	execFile: vi.fn<Test>(),
	env: { SCANS_WITHOUT_SANDBOX: false }
}));
vi.mock('node:child_process', () => ({ execFile }));
vi.mock('$app/env/private', () => env);

/** Loaded anew: that there is a sandbox is remembered. */
async function load(options: { withoutSandbox?: boolean } = {}) {
	env.SCANS_WITHOUT_SANDBOX = options.withoutSandbox ?? false;
	vi.resetModules();
	const { logger } = await import('#lib/logger');
	return {
		...(await import('./scanSandbox')),
		error: vi.spyOn(logger, 'error').mockReturnValue(),
		warn: vi.spyOn(logger, 'warn').mockReturnValue()
	};
}

/** How the next tests of the sandbox end. */
const testEnds = (error: Error | null, stderr = '') =>
	execFile.mockImplementation((_file, _args, _options, done) => done(error, '', stderr));

const tookTooLong = Object.assign(new Error('Command failed'), { killed: true });
const missing = [
	['is not installed', new Error('spawn setpriv ENOENT'), '', 'spawn setpriv ENOENT'],
	['knows no Landlock', new Error('Command failed'), 'bad option\n', 'bad option'],
	['takes too long', tookTooLong, '', 'The test took too long']
] as const;

beforeEach(() => vi.resetAllMocks());

describe('the sandbox', () => {
	test('is what Node starts in, allowing no writing and not the app itself', async () => {
		testEnds(null);
		const { mayOpenScans, sandboxCommand, error } = await load();
		expect(await mayOpenScans()).toBe(true);
		const { execPath, execArgv } = sandboxCommand(['--max-old-space-size=1']);
		expect(execPath).toBe('/usr/bin/setpriv');
		expect(execArgv.slice(0, 3)).toEqual(['--no-new-privs', '--landlock-access', 'fs']);
		expect(execArgv.slice(-2)).toEqual([process.execPath, '--max-old-space-size=1']);
		const rules = execArgv.filter((arg) => arg.startsWith('path-beneath:'));
		expect(rules).toContain('path-beneath:execute,read-file,read-dir:/usr');
		expect(rules.some((rule) => /write|make|remove|truncate|refer/.test(rule))).toBe(false);
		const paths = rules.map((rule) => rule.split(':')[2]);
		expect(paths).not.toContain(process.cwd());
		expect(paths).not.toContain('/');
		expect(error).not.toHaveBeenCalled();
	});

	test('is tried until it works, and not again', async () => {
		testEnds(tookTooLong);
		const { mayOpenScans, sandboxCommand } = await load();
		expect(await mayOpenScans()).toBe(false);
		testEnds(null);
		expect(await mayOpenScans()).toBe(true);
		expect(await mayOpenScans()).toBe(true);
		expect(execFile).toHaveBeenCalledTimes(2);
		expect(sandboxCommand([]).execPath).toBe('/usr/bin/setpriv');
	});

	test('is tried once by all who ask at a time', async () => {
		testEnds(null);
		const { mayOpenScans } = await load();
		expect(await Promise.all([mayOpenScans(), mayOpenScans()])).toEqual([true, true]);
		expect(execFile).toHaveBeenCalledOnce();
	});

	test.each(missing)('opens nothing where setpriv %s, an error told once', async (...args) => {
		const [, failure, stderr, reason] = args;
		testEnds(failure, stderr);
		const { mayOpenScans, sandboxCommand, error, warn } = await load();
		expect(await mayOpenScans()).toBe(false);
		expect(await mayOpenScans()).toBe(false);
		expect(() => sandboxCommand([])).toThrow();
		expect(error).toHaveBeenCalledExactlyOnceWith(expect.any(String), { reason });
		expect(warn).not.toHaveBeenCalled();
	});

	test.each(missing)('is done without where setpriv %s, if that is allowed', async (...args) => {
		const [, failure, stderr, reason] = args;
		testEnds(failure, stderr);
		const { mayOpenScans, sandboxCommand, error, warn } = await load({ withoutSandbox: true });
		expect(await mayOpenScans()).toBe(true);
		expect(sandboxCommand(['-x'])).toEqual({ execPath: process.execPath, execArgv: ['-x'] });
		expect(warn).toHaveBeenCalledExactlyOnceWith(expect.any(String), { reason });
		expect(error).not.toHaveBeenCalled();
	});

	test('is used where there is one, though it might be done without', async () => {
		testEnds(null);
		const { mayOpenScans, sandboxCommand } = await load({ withoutSandbox: true });
		expect(await mayOpenScans()).toBe(true);
		expect(sandboxCommand([]).execPath).toBe('/usr/bin/setpriv');
	});

	test('starts nothing before it was tried', async () => {
		const { sandboxCommand } = await load();
		expect(() => sandboxCommand([])).toThrow();
	});
});
