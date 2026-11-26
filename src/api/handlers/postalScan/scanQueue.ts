import { SCAN_READERS } from '$app/env/private';
import { beforeShutdown, isShuttingDown } from '#api/services/shutdown';
import { logger } from '#lib/logger';
import { finishDelivery } from './finishTask';
import { takeInPageTask } from './pageTask';
import { canOpenScans } from './scanProcess';
import { createPageReaders } from './scanReader';
import { finishPage, finishSplit, removeDelivery, type ScanTask } from './scanTaskService';
import { splitDelivery } from './splitTask';
import { createTaskLane } from './taskLane';

/**
 * Takes in the files scanners delivered, as uploading them by hand would: a file is split into pages, each
 * page is taken in by itself, and its owner told of what came to nothing once all are. One may be gigabytes:
 * no more than a page of it is in memory. Files are split beside the pages taken in, so the first pages of
 * one are there while it is still split: in every app process one split at a time, and `SCAN_READERS` pages. A page taken in again
 * changes nothing (it is stored once), so what failed, or whose process died, is simply tried again.
 */

/** How often what waits for another attempt, or was left by a process that died, is looked for. */
const POLL_MS = 60_000;

let stopping = false;
const isEnding = () => stopping || isShuttingDown();

const logGivenUp = ({ kind, deliveryId, page, attempts }: ScanTask) =>
	logger.error('A delivered scan could not be taken in and was given up', {
		kind,
		deliveryId,
		page,
		attempts
	});

/** Reading is what takes long: as many pages at once as there are processes for it (`SCAN_READERS`). */
const reader = createPageReaders(SCAN_READERS);

const splitting = createTaskLane({
	kinds: ['SPLIT'],
	isEnding,
	work: (task) =>
		splitDelivery({ task, isEnding, onPage: () => pages.wake() }).then(() => pages.wake()),
	async giveUp(task) {
		logGivenUp(task);
		// the pages cut so far are taken in all the same
		await finishSplit({ of: task, result: { problem: { reason: 'failed' } } });
		pages.wake();
	}
});

const pages = createTaskLane({
	kinds: ['PAGE', 'FINISH'],
	isEnding,
	parallel: SCAN_READERS,
	work: (task) =>
		task.kind === 'FINISH' ? finishDelivery(task) : takeInPageTask({ task, reader }),
	async giveUp(task) {
		logGivenUp(task);
		// nobody could be told, which the log does
		if (task.kind === 'FINISH') return removeDelivery(task);
		await finishPage({ of: task, result: { problem: { reason: 'failed' } } });
	}
});

/**
 * Has this process work through the queue, in the background. Where scans may not be opened (no sandbox),
 * all waits as it came, untouched, for a process that may.
 */
export function wakeScanQueue() {
	void canOpenScans().then((can) => {
		if (!can) return;
		splitting.wake();
		pages.wake();
	});
}

let stopped: Promise<unknown> | undefined;

/** Takes nothing further in, and lets go of what it is at: the process is about to end. */
function stopScanQueue() {
	stopping = true;
	reader.stop();
	stopped ??= Promise.all([splitting.release(), pages.release()]);
	return stopped;
}

let started = false;

/** Starts working through the queue, with the server. */
export function startScanQueue() {
	if (started) return;
	started = true;
	wakeScanQueue();
	const poll = setInterval(wakeScanQueue, POLL_MS);
	poll.unref();
	// at once, as requests may take a while to end; the database stays open until it is done
	process.once('SIGTERM', () => void stopScanQueue());
	beforeShutdown(async () => {
		clearInterval(poll);
		await stopScanQueue();
	});
}
