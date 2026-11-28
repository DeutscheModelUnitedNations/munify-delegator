import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema, type Transaction } from '#api/db/db';
import { agreementDetailPubsub, postalScanPubsub, storedFilePubsub } from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { detailsToForget } from '#lib/paperScan/agreementDetails';
import type { PaperField } from '#lib/paperScan/fields';
import { judgeRescan, type KeptOutcome, type StoredReadings } from '#lib/paperScan/intake/rescan';
import { pageKeyOf } from '#lib/paperScan/intake/scanFile';
import { fieldsOfCode } from '#lib/paperScan/readScan';
import {
	forgetScannedDetails,
	paperReadingsSchema
} from '#api/handlers/agreementDetail/agreementDetailService';
import { verifyCode } from '#api/handlers/signedCode/signedCodeService';

/** Where a person in the app may say a scan came from; scanners deliver by themselves. */
const APP_SOURCES: readonly string[] = ['UPLOAD', 'FOLDER', 'CAMERA'];

/** The arguments of `importPostalScan`. */
export const importArgsSchema = z.looseObject({
	code: z.string().max(4000).nullish(),
	contentKey: z.string().regex(/^[0-9a-f]{64}:\d{1,4}$/),
	source: z.string().refine((source) => APP_SOURCES.includes(source), {
		error: () => m.postalScanSourceInvalid()
	}),
	readings: paperReadingsSchema.nullish()
});

type ScanSource = (typeof schema.postalScan.$inferInsert)['source'];

/** A page as its printed code says it is. */
export interface PrintedScanPage {
	pageKey: string;
	fields: PaperField[];
}

/**
 * What page of whose documents a code is printed on, checked here, whatever the client made of it:
 * INVALID_INPUT unless it is a code of the user's documents in the conference. Without a code the
 * page is only the one of its file.
 */
export async function printedPage({
	code,
	contentKey,
	conferenceId,
	userId
}: {
	code?: string | null;
	contentKey: string;
	conferenceId: string;
	userId: string;
}): Promise<PrintedScanPage> {
	if (!code)
		return { pageKey: await pageKeyOf({ code: null, fields: [], contentKey }), fields: [] };
	const checked = await verifyCode({ text: code });
	if (
		!checked.valid ||
		checked.claims.kind !== 'print' ||
		checked.claims.conferenceId !== conferenceId ||
		checked.claims.userId !== userId
	) {
		throw apiError({ code: 'INVALID_INPUT', message: m.postalScanWrongCode() });
	}
	const fields = fieldsOfCode(checked.code);
	return { pageKey: await pageKeyOf({ code: checked.code, fields, contentKey }), fields };
}

/** The scan of a page a person has already, if any. */
export async function findPostalScan({
	conferenceParticipantId,
	pageKey,
	tx = db
}: {
	conferenceParticipantId: string;
	pageKey: string;
	tx?: Transaction | typeof db;
}) {
	return tx.query.postalScan.findFirst({
		where: { conferenceParticipantId, pageKey },
		columns: { id: true, readings: true }
	});
}

/** Takes the file from whoever uploaded it: who may read it follows the scan alone from then on. */
async function disownFile({ tx, fileId }: { tx: Transaction; fileId: string }) {
	await tx
		.update(schema.storedFile)
		.set({ uploadedById: null })
		.where(eq(schema.storedFile.id, fileId));
}

/**
 * Keeps a stored file as the scan of a person's page, unless they have one that says as much
 * (`judgeRescan`); one that says less is replaced. Two deliveries of a page at once are told apart
 * under a lock on the person. A file that was not kept goes with the next `file-cleanup`, and nobody
 * reads it until then.
 */
export async function keepPostalScan({
	conferenceParticipantId,
	fileId,
	source,
	page: { pageKey, fields },
	readings,
	uploadedById
}: {
	conferenceParticipantId: string;
	fileId: string;
	source: ScanSource;
	page: PrintedScanPage;
	readings: StoredReadings;
	uploadedById: string | null;
}): Promise<KeptOutcome> {
	const table = schema.postalScan;
	const kept = await db.transaction(async (tx) => {
		await tx
			.select({ id: schema.conferenceParticipant.id })
			.from(schema.conferenceParticipant)
			.where(eq(schema.conferenceParticipant.id, conferenceParticipantId))
			.for('update');
		const known = await findPostalScan({ conferenceParticipantId, pageKey, tx });
		const outcome = judgeRescan({ known, readings });
		await disownFile({ tx, fileId });
		const scan = { fileId, source, readings, uploadedById };
		if (outcome === 'stored') {
			await tx.insert(table).values({ ...scan, conferenceParticipantId, pageKey, fields });
		}
		if (outcome === 'replaced' && known) {
			await tx
				.update(table)
				.set(scan)
				.where(and(eq(table.id, known.id), eq(table.pageKey, pageKey)));
		}
		return { outcome, replacedId: outcome === 'replaced' ? known?.id : undefined };
	});
	storedFilePubsub.updated(fileId);
	if (kept.outcome === 'stored') postalScanPubsub.created();
	if (kept.replacedId) postalScanPubsub.updated(kept.replacedId);
	return kept.outcome;
}

/**
 * Deletes a scan, and the details only it told of; the statuses stay as they are. Its file follows with
 * the next `file-cleanup`.
 */
export async function deletePostalScan(id: string) {
	const forgotten = await db.transaction(async (tx) => {
		const scan = await tx.query.postalScan.findFirst({
			where: { id },
			columns: { conferenceParticipantId: true }
		});
		if (!scan) return false;
		const participantId = scan.conferenceParticipantId;
		// no delivery of the same person's pages in between
		await tx
			.select({ id: schema.conferenceParticipant.id })
			.from(schema.conferenceParticipant)
			.where(eq(schema.conferenceParticipant.id, participantId))
			.for('update');
		const [removed] = await tx
			.delete(schema.postalScan)
			.where(eq(schema.postalScan.id, id))
			.returning({ readings: schema.postalScan.readings });
		if (!removed) return false;
		const remaining = await tx.query.postalScan.findMany({
			where: { conferenceParticipantId: participantId },
			columns: { readings: true }
		});
		const stored = await tx.query.agreementDetail.findMany({
			where: { conferenceParticipantId: participantId },
			columns: { field: true, state: true, source: true }
		});
		const fields = detailsToForget({
			removed: removed.readings,
			remaining: remaining.map(({ readings }) => readings),
			stored
		});
		return forgetScannedDetails({ tx, participantId, fields });
	});
	postalScanPubsub.removed();
	if (forgotten) agreementDetailPubsub.removed();
}
