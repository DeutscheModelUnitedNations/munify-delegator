import { mayDeliver } from '#api/handlers/scannerAccess/scannerAccessPermissions';
import {
	currentDeliverer,
	noteDelivery,
	type Deliverer
} from '#api/handlers/scannerAccess/scannerAccessService';
import { filePurpose } from '#api/handlers/storedFile/storageClient';
import { deleteObject, storeStream } from '#api/handlers/storedFile/storedFileService';
import { logger } from '#lib/logger';
import { MAX_POSTAL_SCAN_SIZE, MAX_SCAN_FILE_SIZE } from '#lib/paperScan/limits';
import { SIGNATURE_WITHIN, scanFileType } from '#lib/paperScan/intake/scanFile';
import { createIntakeGate, IntakeBusyError } from './intakeGate';
import { wakeScanQueue } from './scanQueue';
import { countDeliveries, queueDelivery } from './scanTaskService';

/**
 * Receives what a scanner delivers by itself, over WebDAV (`./webdav`). A file goes to the bucket as it comes
 * in, however large it is, is queued, and the scanner is answered: what it was told arrived is never lost,
 * and it does not wait until the pages were read (`./scanQueue`).
 */

/** Thrown when a login may not deliver any more: removed, expired, or its owner lost the role. */
export class NotAllowedToDeliverError extends Error {
	constructor() {
		super('This login may not deliver scans');
		this.name = 'NotAllowedToDeliverError';
	}
}

/** Thrown for what is no scan (415) or too large a one (413), which is not stored. */
export class ScanRefusedError extends Error {
	constructor(readonly status: 413 | 415) {
		super('Not a scan that is taken');
		this.name = 'ScanRefusedError';
	}
}

/** Uploads take some 16 MB each while they come in, which may take long. */
const gate = createIntakeGate({ places: 20, perPerson: 4, patienceMs: 60_000 });

/** How much of one person may wait: far more than is ever scanned in one go. */
const MAX_WAITING = { files: 500, bytes: 5 * MAX_SCAN_FILE_SIZE };

/** A file as it comes in, and as large as it was said to be, if that was said. */
export interface IncomingScan {
	name: string;
	body: AsyncIterable<Uint8Array>;
}

/** The beginning of what comes in, enough to tell what it is, and all of it. */
async function peek(body: AsyncIterable<Uint8Array>) {
	const chunks = body[Symbol.asyncIterator]();
	const first: Uint8Array[] = [];
	let length = 0;
	while (length < SIGNATURE_WITHIN) {
		const { done, value } = await chunks.next();
		if (done) break;
		first.push(value);
		length += value.length;
	}
	const head = new Uint8Array(length);
	let at = 0;
	for (const chunk of first) {
		head.set(chunk, at);
		at += chunk.length;
	}
	return {
		head,
		async *all() {
			yield head;
			yield* { [Symbol.asyncIterator]: () => chunks };
		}
	};
}

/** Refuses what grows too large, however large it was said to be. */
async function* limited({ body, limit }: { body: AsyncIterable<Uint8Array>; limit: number }) {
	let size = 0;
	for await (const chunk of body) {
		size += chunk.length;
		if (size > limit) throw new ScanRefusedError(413);
		yield chunk;
	}
}

/** Stores what comes in; nothing for an empty file, which devices try the folder with. */
async function store({ userId, body }: { userId: string; body: AsyncIterable<Uint8Array> }) {
	const { head, all } = await peek(body);
	if (head.length === 0) return undefined;
	const mimeType = scanFileType(head);
	if (!mimeType) throw new ScanRefusedError(415);
	// a picture is a page
	const limit = mimeType === 'application/pdf' ? MAX_SCAN_FILE_SIZE : MAX_POSTAL_SCAN_SIZE;
	return storeStream({
		userId,
		purpose: filePurpose({ kind: 'scanDelivery', field: 'scan' }),
		mimeType,
		body: limited({ body: all(), limit })
	});
}

/**
 * Receives a file of a login that signed in before: `open` begins to read it once it is its turn
 * (`intakeGate`). Whether the login may deliver is asked again when its turn comes and once it is received, so
 * a slow upload outlives neither its login nor its owner's last role; what was queued is taken in all the
 * same. Throws `NotAllowedToDeliverError`, `ScanRefusedError`, `IntakeBusyError` when its turn does not come or
 * too much waits already, and whatever fails while it is stored.
 */
export function ingestScan({
	deliverer: { accessId, userId },
	open
}: {
	deliverer: Deliverer;
	open: () => IncomingScan;
}) {
	return gate.run({
		userId,
		work: async () => {
			await assertStillAllowed(accessId);
			await assertRoom(userId);
			const { name, body } = open();
			const stored = await store({ userId, body });
			if (!stored) return;
			try {
				const deliverer = await assertStillAllowed(accessId);
				await queueDelivery({ deliverer, file: { name, ...stored } });
			} catch (error) {
				await deleteObject(stored.key).catch(() => undefined);
				throw error;
			}
			wakeScanQueue();
			// it arrived, so the scanner is told so whatever becomes of this
			await noteDelivery(accessId).catch((error: unknown) =>
				logger.warn('Noting a delivery failed', error)
			);
		}
	});
}

async function assertRoom(userId: string) {
	const { files, bytes } = await countDeliveries(userId);
	if (files >= MAX_WAITING.files || bytes >= MAX_WAITING.bytes) throw new IntakeBusyError();
}

/** The login as it is now; throws once it may not deliver any more. */
async function assertStillAllowed(accessId: string) {
	const deliverer = await currentDeliverer(accessId);
	if (!deliverer || !(await mayDeliver(deliverer))) throw new NotAllowedToDeliverError();
	return deliverer;
}
