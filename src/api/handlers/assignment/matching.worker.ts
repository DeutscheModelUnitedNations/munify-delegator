import { parentPort, workerData } from 'node:worker_threads';
import { autoAssignSingles, type AutoAssignSinglesInput } from './autoAssign';

/**
 * Runs one matching off the main thread, started by `./matching`: the job is the worker's data,
 * the matches go back as the one message. Development runs this file directly, production the
 * bundle `bun run build:compute` writes to `build/compute/` (see `tsdown.compute.config.ts`).
 */
const input: AutoAssignSinglesInput = workerData;
parentPort?.postMessage(autoAssignSingles(input));
