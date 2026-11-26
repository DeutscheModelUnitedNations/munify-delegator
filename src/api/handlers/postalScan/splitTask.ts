import { filePurpose } from '#api/handlers/storedFile/storageClient';
import {
	deleteObject,
	readObjectRange,
	storeGeneratedFile
} from '#api/handlers/storedFile/storedFileService';
import { logger } from '#lib/logger';
import { cutName } from '#lib/paperScan/intake/scanFile';
import type { ScanSource } from '#lib/paperScan/intake/source';
import { splitScan, type SplitPage } from './scanSplitter';
import {
	addPage,
	finishSplit,
	lastSplitPage,
	releaseTask,
	renewHold,
	type ScanTask
} from './scanTaskService';

/** So many pages are split before somebody else's file may have its turn. */
const TURN = 200;
/** How often the split asks whether it still holds the file: not for every page, which is a write. */
const CHECK_HOLD_MS = 15_000;

/** The file as it lies in the bucket. */
const sourceOf = ({ key, size }: ScanTask): ScanSource => ({
	size,
	read: ({ from, to }) => readObjectRange({ key, from, to })
});

/** Stores a page as a file of its own, and queues it to be taken in. */
async function queuePage({ task, cut }: { task: ScanTask; cut: SplitPage }) {
	const { deliveryId, userId, fileName } = task;
	if ('broken' in cut) {
		logger.warn('A page of a delivered scan could not be cut out', {
			deliveryId,
			page: cut.page,
			error: cut.broken
		});
		await addPage({
			deliveryId,
			page: cut.page,
			result: { problem: { reason: 'pageUnreadable' } }
		});
		return;
	}
	const { page, type, bytes } = cut;
	const fileId = await storeGeneratedFile({
		userId,
		purpose: filePurpose({ kind: 'postalScan', field: 'scan' }),
		fileName: cutName({ name: fileName, type, page }),
		mimeType: type,
		bytes
	});
	await addPage({ deliveryId, page, fileId });
}

/**
 * Splits a file into its pages, each queued as soon as it is cut, and goes on where it stopped before. The
 * file is gone then: no more than its pages are needed.
 */
export async function splitDelivery({
	task,
	onPage,
	isEnding
}: {
	task: ScanTask;
	/** Told when there is a page to take in. */
	onPage: () => void;
	isEnding: () => boolean;
}) {
	const from = (await lastSplitPage(task.deliveryId)) + 1;
	const pages = splitScan({ source: sourceOf(task), from });
	let checkedAt = Date.now();
	/** Whether it still holds the file, asked now and then; the lane renews the hold meanwhile. */
	const stillHeld = async () => {
		if (Date.now() - checkedAt < CHECK_HOLD_MS) return true;
		checkedAt = Date.now();
		return renewHold(task);
	};
	for (;;) {
		const { done, value } = await pages.next();
		if (done) {
			const result = value === 'ended' ? undefined : { problem: { reason: value } };
			if (await finishSplit({ of: task, result })) await removeFile(task);
			return;
		}
		// somebody else has the file by now, who goes on from here
		if (isEnding() || !(await stillHeld())) return void (await pages.return('ended'));
		await queuePage({ task, cut: value });
		onPage();
		if (value.page - from + 1 >= TURN) {
			await pages.return('ended');
			return releaseTask({ of: task });
		}
	}
}

/** Failing that, the `file-cleanup` job finds it. */
async function removeFile({ key }: ScanTask) {
	await deleteObject(key).catch((error: unknown) =>
		logger.warn('Deleting a scan that was split failed', error)
	);
}
