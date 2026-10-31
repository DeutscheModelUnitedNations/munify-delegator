import { dev } from '$app/env';
import type { AutoAssignSinglesInput, autoAssignSingles } from '#lib/assignment/autoAssign';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

/** Longer matchings are abandoned, so a pathological input cannot hang. */
const TIMEOUT_MS = 30_000;

// Development runs the source through tsx (a plain Node worker cannot resolve the aliases),
// production the bundle `bun run build:compute` writes.
const workerSource = join(process.cwd(), 'src', 'lib', 'assignment', 'matching.worker.ts');
const workerBundle = join(process.cwd(), 'build', 'compute', 'matching.mjs');

/** Runs `autoAssignSingles` on a worker thread, so a large conference does not block the event loop. */
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
