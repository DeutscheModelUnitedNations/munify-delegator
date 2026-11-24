import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '#lib/logger';

/**
 * Keeps the processes that open scans (`./scanProcess`) to what they need: Linux's Landlock, set up by
 * `setpriv` (util-linux 2.40 and later, in the app's image) before Node starts in its place. Native code
 * draws the pages, so this holds whatever runs in there: nothing is written, nothing read but programs,
 * libraries and the code itself, and no other process is looked into, so the app's environment with its
 * secrets stays out of reach though both run as one user. The network is not kept from them.
 */

/** In full: the processes are given no `PATH`. */
const SETPRIV = '/usr/bin/setpriv';

const FOLDER = 'execute,read-file,read-dir';
const FILE = 'read-file';

/**
 * What they reach, and how: programs, libraries and fonts, devices, what Node asks of itself, and their own
 * code with the `package.json`s Node looks for around it.
 */
const reachable = (): [path: string, access: string][] => {
	const app = process.cwd();
	const reached: [path: string, access: string][] = [
		...['/usr', '/lib', '/lib64', '/bin', '/etc', '/dev', '/proc', '/sys'].map(
			(path): [string, string] => [path, FOLDER]
		),
		[process.execPath, `execute,${FILE}`],
		[join(app, 'build/compute'), FOLDER],
		[join(app, 'node_modules'), FOLDER],
		[join(app, 'build/package.json'), FILE],
		[join(app, 'package.json'), FILE]
	];
	return reached.filter(([path]) => existsSync(path));
};

/** What `setpriv` is told before the program it starts. */
const landlock = () => [
	'--no-new-privs',
	'--landlock-access',
	'fs',
	...reachable().flatMap(([path, access]) => ['--landlock-rule', `path-beneath:${access}:${path}`])
];

/** Tried once: not every system has it. */
let available: boolean | undefined;

function isAvailable(prefix: readonly string[]) {
	const { status, error, stderr } = spawnSync(SETPRIV, [...prefix, process.execPath, '--version'], {
		env: {},
		timeout: 10_000,
		encoding: 'utf8'
	});
	if (status === 0) return true;
	logger.warn('Scans are opened without a sandbox: this system has no Landlock for it', {
		reason: error?.message ?? stderr
	});
	return false;
}

/** How `fork` starts Node with `nodeArgs`: in the sandbox, or as it is where there is none. */
export function sandboxCommand(nodeArgs: readonly string[]) {
	const prefix = landlock();
	available ??= isAvailable(prefix);
	if (!available) return { execPath: process.execPath, execArgv: [...nodeArgs] };
	return { execPath: SETPRIV, execArgv: [...prefix, process.execPath, ...nodeArgs] };
}
