// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { spawnSync } = vi.hoisted(() => ({ spawnSync: vi.fn() }));
vi.mock('node:child_process', () => ({ spawnSync }));

/** Loaded anew: whether there is a sandbox is tried once. */
const load = async () => {
	vi.resetModules();
	return (await import('./scanSandbox')).sandboxCommand;
};

beforeEach(() => vi.resetAllMocks());

describe('sandboxCommand', () => {
	test('starts Node in the sandbox, which allows no writing and not the app itself', async () => {
		spawnSync.mockReturnValue({ status: 0 });
		const sandboxCommand = await load();
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
		sandboxCommand([]);
		expect(spawnSync).toHaveBeenCalledOnce();
	});

	test.each([
		['is not installed', { status: null, error: new Error('ENOENT') }],
		['knows no Landlock', { status: 1, stderr: 'unrecognized option' }]
	])('starts Node as it is where setpriv %s, and says so once', async (_, result) => {
		spawnSync.mockReturnValue(result);
		const sandboxCommand = await load();
		const warn = vi.spyOn((await import('#lib/logger')).logger, 'warn').mockReturnValue();
		expect(sandboxCommand(['-x'])).toEqual({ execPath: process.execPath, execArgv: ['-x'] });
		sandboxCommand([]);
		expect(warn).toHaveBeenCalledOnce();
	});
});
