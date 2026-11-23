import { dev } from '$app/env';
import { join } from 'node:path';
import { Worker, type ResourceLimits } from 'node:worker_threads';

/**
 * Runs CPU-bound work on a worker thread, so it does not block the event loop: the worker gets its
 * data once and answers with one message. Development runs the source through tsx (a plain Node
 * worker cannot resolve the aliases), production the bundle `bun run build:compute` writes.
 */
export function runComputeWorker<T>({
	source,
	bundle,
	data,
	timeoutMs,
	resourceLimits
}: {
	/** The worker's file, under `src/api/handlers`. */
	source: string[];
	/** What it is called in `tsdown.compute.config.ts`. */
	bundle: string;
	data: unknown;
	/** Longer work is abandoned, so a pathological input cannot hang. */
	timeoutMs: number;
	resourceLimits?: ResourceLimits;
}) {
	return new Promise<T>((resolve, reject) => {
		const worker = dev
			? new Worker(join(process.cwd(), 'src', 'api', 'handlers', ...source), {
					workerData: data,
					execArgv: ['--import', 'tsx'],
					resourceLimits
				})
			: new Worker(join(process.cwd(), 'build', 'compute', `${bundle}.mjs`), {
					workerData: data,
					resourceLimits
				});
		const timer = setTimeout(() => {
			void worker.terminate();
			reject(new Error(`The ${bundle} worker took longer than ${timeoutMs / 1000}s`));
		}, timeoutMs);
		worker.once('message', (answer: T) => {
			clearTimeout(timer);
			resolve(answer);
			void worker.terminate();
		});
		worker.once('error', (error) => {
			clearTimeout(timer);
			reject(error);
		});
		worker.once('exit', (code) => {
			clearTimeout(timer);
			if (code !== 0) reject(new Error(`The ${bundle} worker exited with code ${code}`));
		});
	});
}
