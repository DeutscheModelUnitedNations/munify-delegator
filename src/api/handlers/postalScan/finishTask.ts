import { conferencesToDeliverInto } from '#api/handlers/scannerAccess/scannerAccessPermissions';
import { deleteObject } from '#api/handlers/storedFile/storedFileService';
import { logger } from '#lib/logger';
import { problemsOfPages, type PageResult, type ScanProblem } from '#lib/paperScan/intake/problems';
import { tellScanProblems } from './scanProblemNotice';
import {
	hasPagesLeft,
	releaseTask,
	renewHold,
	removeDelivery,
	resultsOf,
	type ScanTask
} from './scanTaskService';

/** When pages are still worked on: looked at again then, though the last of them says so. */
const LOOK_AGAIN_MS = 60_000;

/** What there is to tell of a file: of its splitting (page 0) as a whole, and of its pages. */
export function problemsOfDelivery({
	file,
	results
}: {
	file: string;
	results: readonly PageResult[];
}): ScanProblem[] {
	const split = results.find(({ page }) => page === 0)?.problem;
	const pages = results.filter(({ page }) => page > 0);
	return [...problemsOfPages({ file, pages }), ...(split ? [{ file, pages: [], ...split }] : [])];
}

/**
 * Ends a file's time in the queue once its pages are done: its owner is told of all that came to nothing in
 * one go, and only then it is gone, so a crash in between tells them again rather than never.
 */
export async function finishDelivery(task: ScanTask) {
	if (await hasPagesLeft(task.deliveryId)) {
		return releaseTask({ of: task, delayMs: LOOK_AGAIN_MS });
	}
	// another process has it by now (this one was too slow), which tells them: never twice
	if (!(await renewHold(task))) return;
	const results = await resultsOf(task.deliveryId);
	const problems = problemsOfDelivery({ file: task.fileName, results });
	if (problems.length > 0) {
		const conferences = await conferencesToDeliverInto(task.userId);
		await tellScanProblems({ problems, scanner: task.accessName, conferences });
	}
	await removeDelivery(task);
	// it went when it was split, but for a process that died just then
	await deleteObject(task.key).catch((error: unknown) =>
		logger.warn('Deleting a scan that was taken in failed', error)
	);
}
