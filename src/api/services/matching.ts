import { dev } from '$app/environment';
import type { AutoAssignSinglesInput, autoAssignSingles } from '$lib/assignment/autoAssign';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

/** A matching that takes longer than this is abandoned, so a pathological input cannot hang. */
const TIMEOUT_MS = 30_000;

/**
 * Where the worker lives. A production build runs the bundle `bun run build:compute` puts next to
 * the adapter's `index.js`; the development server runs the source directly (through tsx, which
 * resolves the extensionless imports and path aliases a plain Node worker cannot), so an edit is
 * picked up by the next run without rebuilding anything.
 */
const workerSource = join(process.cwd(), 'src', 'lib', 'assignment', 'matching.worker.ts');
const workerBundle = join(process.cwd(), 'build', 'compute', 'matching.mjs');

/**
 * Seats single participants (see `autoAssignSingles`) on a worker thread, so a large conference
 * does not block the event loop for everybody else.
 */
export function matchSingles(input: AutoAssignSinglesInput) {
	return new Promise<ReturnType<typeof autoAssignSingles>>((resolve, reject) => {
		const worker = dev
			? new Worker(workerSource, { workerData: input, execArgv: ['--import', 'tsx'] })
			: new Worker(workerBundle, { workerData: input });
		const timer = setTimeout(() => {
			void worker.terminate();
			reject(new Error(`The matching took longer than ${TIMEOUT_MS / 1000}s`));
		}, TIMEOUT_MS);
		worker.once('message', (matches) => {
			clearTimeout(timer);
			resolve(matches);
			void worker.terminate();
		});
		worker.once('error', (error) => {
			clearTimeout(timer);
			reject(error);
		});
		worker.once('exit', (code) => {
			clearTimeout(timer);
			if (code !== 0) reject(new Error(`The matching worker exited with code ${code}`));
		});
	});
}
