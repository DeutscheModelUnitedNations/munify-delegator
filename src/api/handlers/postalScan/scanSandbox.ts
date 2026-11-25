import { SCANS_WITHOUT_SANDBOX } from '$app/env/private';
import { execFile } from 'node:child_process';
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

/** How long the test may take: far longer than it does, unless the system is overloaded. */
const TEST_TIMEOUT_MS = 10_000;

/** Why Node does not start in the sandbox; `undefined` when it does. */
const testSandbox = () =>
	new Promise<string | undefined>((resolve) => {
		const command = [...landlock(), process.execPath, '--version'];
		const options = { env: {}, timeout: TEST_TIMEOUT_MS, killSignal: 'SIGKILL' } as const;
		execFile(SETPRIV, command, options, (error, _stdout, stderr) => {
			if (!error) resolve(undefined);
			else if (error.killed) resolve('The test took too long');
			else resolve(stderr.trim() || error.message);
		});
	});

let available = false;
/** What was logged last, so what stays the same is told once. */
let toldReason: string | undefined;
let testing: Promise<boolean> | undefined;

/**
 * Tries the sandbox. Only that it works is remembered: what failed may have been a system too busy just
 * then, and is tried again the next time.
 */
async function isAvailable() {
	available ||= await (testing ??= test().finally(() => (testing = undefined)));
	return available;
}

async function test() {
	const reason = await testSandbox();
	if (reason !== undefined && reason !== toldReason) tell(reason);
	toldReason = reason;
	return reason === undefined;
}

function tell(reason: string) {
	if (SCANS_WITHOUT_SANDBOX) {
		logger.warn('Scans are opened without a sandbox: this system has no Landlock for it', {
			reason
		});
	} else {
		logger.error('Delivered scans wait: this system has no sandbox to open them in', { reason });
	}
}

/**
 * Whether scans may be opened: in the sandbox, or without one where the deployment says so
 * (`SCANS_WITHOUT_SANDBOX`). Asked before anything is started; what is logged says why not.
 */
export async function mayOpenScans() {
	return (await isAvailable()) || SCANS_WITHOUT_SANDBOX;
}

/**
 * How `fork` starts Node with `nodeArgs`: in the sandbox, or as it is where the deployment allows that.
 * Throws without either, or before `mayOpenScans` was asked.
 */
export function sandboxCommand(nodeArgs: readonly string[]) {
	if (available) {
		return { execPath: SETPRIV, execArgv: [...landlock(), process.execPath, ...nodeArgs] };
	}
	if (!SCANS_WITHOUT_SANDBOX) throw new Error('There is no sandbox to open scans in');
	return { execPath: process.execPath, execArgv: [...nodeArgs] };
}
