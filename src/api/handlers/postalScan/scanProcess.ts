import { dev } from '$app/env';
import { fork, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { sandboxCommand } from './scanSandbox';

/**
 * The processes delivered scans are split and read in (`scanSplitter.worker`, `scanReader.worker`). Whoever
 * made a PDF decides what opening it takes, and drawing a page leaks native memory, so this happens apart
 * from the app: what it takes ends with the process, and so does what makes it crash. They know nothing of
 * the app but what they are sent, and where the system can, they reach nothing else (`./scanSandbox`).
 */

/** A process that says nothing for so long while it is asked something has hung. */
const SILENCE_MS = 60_000;
/** In MB; what pages are drawn with is not on the heap (`MEMORY_BUDGET` in the workers). */
const HEAP_MB = 512;

/** Thrown when a process ended before it answered: crashed, hung, or out of memory. */
export class ProcessEndedError extends Error {
	constructor(name: string) {
		super(`The ${name} process ended before it answered`);
		this.name = 'ProcessEndedError';
	}
}

function start(name: string): ChildProcess {
	const nodeArgs = [`--max-old-space-size=${HEAP_MB}`];
	const [file, command] = dev
		? [
				join(process.cwd(), 'src/api/handlers/postalScan', `${name}.worker.ts`),
				{ execPath: process.execPath, execArgv: ['--import', 'tsx', ...nodeArgs] }
			]
		: [join(process.cwd(), 'build/compute', `${name}.mjs`), sandboxCommand(nodeArgs)];
	return fork(file, [], {
		...command,
		stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
		// bytes go as they are
		serialization: 'advanced',
		// none of the app's secrets
		env: { NODE_ENV: process.env.NODE_ENV }
	});
}

/**
 * A process to talk to: what it says comes one by one (`next`), what it is told goes out (`tell`). `I` and `O`
 * are what goes in and comes out.
 */
export function createScanProcess<I extends object, O extends object>(name: string) {
	const child = start(name);
	const said: O[] = [];
	let waiting: { resolve: (message: O) => void; reject: (error: Error) => void } | undefined;
	let ended = false;

	const end = () => {
		ended = true;
		waiting?.reject(new ProcessEndedError(name));
		waiting = undefined;
	};
	child.on('message', (message: O) => {
		if (!waiting) return void said.push(message);
		waiting.resolve(message);
		waiting = undefined;
	});
	child.once('error', end);
	child.once('exit', end);

	return {
		get ended() {
			return ended;
		},
		/** What it says next. Throws `ProcessEndedError` when it ends first, or says nothing any more. */
		next(): Promise<O> {
			const message = said.shift();
			if (message) return Promise.resolve(message);
			if (ended) return Promise.reject(new ProcessEndedError(name));
			return new Promise<O>((resolve, reject) => {
				const silence = setTimeout(() => child.kill('SIGKILL'), SILENCE_MS);
				const done = () => clearTimeout(silence);
				waiting = {
					resolve: (heard) => (done(), resolve(heard)),
					reject: (error) => (done(), reject(error))
				};
			});
		},
		tell(message: I) {
			// it may have ended just now, which `next` tells
			if (!ended && child.connected) child.send(message, () => undefined);
		},
		stop() {
			child.kill('SIGKILL');
		}
	};
}

export type ScanProcess<I extends object, O extends object> = ReturnType<
	typeof createScanProcess<I, O>
>;
