import { runComputeWorker } from '#api/services/computeWorker';
import type { AutoAssignSinglesInput, autoAssignSingles } from './autoAssign';

const TIMEOUT_MS = 30_000;

/** Runs `autoAssignSingles` on a worker thread, so a large conference does not block the event loop. */
export function matchSingles(input: AutoAssignSinglesInput) {
	return runComputeWorker<ReturnType<typeof autoAssignSingles>>({
		source: ['assignment', 'matching.worker.ts'],
		bundle: 'matching',
		data: input,
		timeoutMs: TIMEOUT_MS
	});
}
