import { parentPort, workerData } from 'node:worker_threads';
import { autoAssignSingles, type AutoAssignSinglesInput } from './autoAssign';

/**
 * Runs one matching off the main thread: the job is the worker's data, the matches go back as the
 * one message. Built to `build/compute/` by `bun run build:compute` (see `tsdown.compute.config.ts`); the development server runs this file directly and
 * started by `$api/services/matching`.
 */
const input: AutoAssignSinglesInput = workerData;
parentPort?.postMessage(autoAssignSingles(input));
