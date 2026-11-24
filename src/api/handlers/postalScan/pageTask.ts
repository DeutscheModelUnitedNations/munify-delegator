import { db } from '#api/db/db';
import { conferencesToDeliverInto } from '#api/handlers/scannerAccess/scannerAccessPermissions';
import { verifyCode } from '#api/handlers/signedCode/signedCodeService';
import { readStoredFile } from '#api/handlers/storedFile/storedFileService';
import { logger } from '#lib/logger';
import { scanFileType } from '#lib/paperScan/intake/scanFile';
import { takePage, type KeepArgs, type KeptPage } from '#lib/paperScan/intake/takePage';
import type { createPageReader } from './scanReader';
import { finishPage, type ScanTask } from './scanTaskService';
import { takeInPage } from './takeInPage';

/** A user's part in a conference. */
async function participantIdOf(who: { userId: string; conferenceId: string }) {
	const participant = await db.query.conferenceParticipant.findFirst({
		where: who,
		columns: { id: true }
	});
	return participant?.id;
}

/** Keeps a page, as the file it was cut out as, and takes in what it says. */
async function keepPage({
	args: { participant: participantId, page, pageKey },
	task: { userId, fileId }
}: {
	args: KeepArgs<string>;
	task: ScanTask;
}): Promise<KeptPage> {
	const outcome = await takeInPage({
		participantId,
		source: 'WEBDAV',
		page: { pageKey, fields: page.fields },
		readings: page.readings,
		uploadedById: userId,
		storeFile: async () => fileId
	});
	// it answers `null` only without a file
	return { outcome: outcome ?? 'known' };
}

/**
 * Takes in a page as its owner uploading it by hand would, in the conference its code names, if they may
 * there.
 */
export async function takeInPageTask({
	task,
	reader
}: {
	task: ScanTask;
	reader: Pick<ReturnType<typeof createPageReader>, 'read'>;
}) {
	const bytes = task.pageKey === null ? null : await readStoredFile(task.pageKey);
	const type = bytes && scanFileType(bytes);
	if (!bytes || !type) throw new Error('The bucket has no such page');
	const conferences = await conferencesToDeliverInto(task.userId);
	const { problem, ignored } = await takePage({
		page: task.page,
		file: { name: task.pageName ?? task.fileName, type, bytes },
		conferenceIds: new Set(conferences.map(({ conferenceId }) => conferenceId)),
		ports: {
			async read(scan) {
				const read = await reader.read(scan);
				if (read.error !== undefined) {
					const { deliveryId, page } = task;
					logger.warn('A page of a delivered scan could not be read', {
						deliveryId,
						page,
						error: read.error
					});
				}
				return read;
			},
			check: (text) => verifyCode({ text }),
			participant: participantIdOf,
			keep: (args) => keepPage({ args, task })
		}
	});
	await finishPage({ of: task, result: { problem, ignored } });
}
