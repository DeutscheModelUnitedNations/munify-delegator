import { db } from '#api/db/db';
import { logger } from '#lib/logger';
import {
	takeScan,
	type KeepArgs,
	type KeptPage,
	type ScanFile
} from '#lib/paperScan/intake/takeScan';
import type { ScanProblem } from '#lib/paperScan/intake/people';
import { mayDeliver } from '#api/handlers/scannerAccess/scannerAccessPermissions';
import {
	currentDeliverer,
	noteDelivery,
	type Deliverer
} from '#api/handlers/scannerAccess/scannerAccessService';
import { verifyCode } from '#api/handlers/signedCode/signedCodeService';
import { filePurpose } from '#api/handlers/storedFile/storageClient';
import { storeGeneratedFile } from '#api/handlers/storedFile/storedFileService';
import { createIntakeGate } from './intakeGate';
import { readScan } from './scanReader';
import { takeInPage } from './takeInPage';
import { tellScanProblems } from './scanProblemNotice';

/**
 * Takes in what a scanner delivers by itself, by email (`./smtpReceiver`) or WebDAV (`./webdav`), as
 * dropping the file on the page would (`takeScan`). Nothing is kept of pages nobody could be found
 * for; whose scanner it was is told of them. The scanner hears it was taken only once all of that is
 * done, so what it was told arrived is never lost, and delivering it again changes nothing.
 */

/** Thrown when a login may not deliver any more: removed, expired, or its owner lost the role. */
export class NotAllowedToDeliverError extends Error {
	constructor() {
		super('This login may not deliver scans');
		this.name = 'NotAllowedToDeliverError';
	}
}

/** Six files of up to 57 MB (as an email) at most are in memory at once. */
const gate = createIntakeGate({ places: 6, perConference: 3, perMember: 2, patienceMs: 60_000 });

type Source = 'EMAIL' | 'WEBDAV';

/** The participant rows of the users who take part in the conference, by user. */
async function participantsOf({
	conferenceId,
	userIds
}: {
	conferenceId: string;
	userIds: string[];
}) {
	const rows = await db.query.conferenceParticipant.findMany({
		where: { conferenceId, userId: { in: userIds } },
		columns: { id: true, userId: true }
	});
	return new Map(rows.map(({ id, userId }) => [userId, id]));
}

/** Keeps a page and takes in what it says. */
async function keepPage({
	args: { participant: participantId, page, pageKey, cut },
	deliverer: { conferenceId, userId },
	source
}: {
	args: KeepArgs<string>;
	deliverer: Deliverer;
	source: Source;
}): Promise<KeptPage> {
	const outcome = await takeInPage({
		participantId,
		source,
		page: { pageKey, fields: page.fields },
		readings: page.readings,
		uploadedById: userId,
		storeFile: async () => {
			const { name, type, bytes } = await cut();
			return storeGeneratedFile({
				conferenceId,
				purpose: filePurpose({ kind: 'postalScan', field: 'scan' }),
				fileName: name,
				mimeType: type,
				bytes
			});
		}
	});
	// it answers `null` only without a file
	return { outcome: outcome ?? 'known' };
}

/** Takes in what was received, and tells its owner of what came to nothing. */
async function takeIn({
	files,
	deliverer,
	source
}: {
	files: readonly ScanFile[];
	deliverer: Deliverer;
	source: Source;
}) {
	const { conferenceId, accessId } = deliverer;
	const problems: ScanProblem[] = [];
	for (const file of files) {
		const taken = await takeScan({
			file,
			conferenceId,
			ports: {
				read: readScan,
				check: (text) => verifyCode({ text }),
				participants: (userIds) => participantsOf({ conferenceId, userIds }),
				keep: (args) => keepPage({ args, deliverer, source }),
				onUnreadable: (error) => logger.warn('A delivered scan could not be opened', error)
			}
		});
		problems.push(...taken.problems);
	}
	await noteDelivery(accessId);
	if (problems.length > 0) tellScanProblems({ problems, deliverer });
	return { problems };
}

/**
 * Takes in a delivery of a login that signed in before: `receive` reads it once it is its turn
 * (`intakeGate`). Whether the login may deliver is asked again when its turn comes, so a session kept
 * open outlives neither its login nor its owner's role. Throws `NotAllowedToDeliverError`,
 * `IntakeBusyError` when its turn does not come, and whatever fails while it is taken in.
 */
export function ingestScans({
	deliverer: { accessId, conferenceId, teamMemberId },
	receive,
	source
}: {
	deliverer: Deliverer;
	receive: () => Promise<readonly ScanFile[]>;
	source: Source;
}) {
	return gate.run({
		keys: { conferenceId, teamMemberId },
		receive: async () => {
			await assertStillAllowed(accessId);
			return receive();
		},
		work: async (files) => takeIn({ files, deliverer: await assertStillAllowed(accessId), source })
	});
}

/** The login as it is now; throws once it may not deliver any more. */
async function assertStillAllowed(accessId: string) {
	const deliverer = await currentDeliverer(accessId);
	if (!deliverer || !(await mayDeliver(deliverer))) throw new NotAllowedToDeliverError();
	return deliverer;
}
