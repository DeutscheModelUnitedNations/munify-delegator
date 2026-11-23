import { applyPaperReadings } from '#api/handlers/agreementDetail/agreementDetailService';
import { judgeRescan, type KeptOutcome } from '#lib/paperScan/intake/rescan';
import type { FieldReading } from '#lib/paperScan/readPaper';
import { findPostalScan, keepPostalScan } from './postalScanService';

/**
 * Keeps a page as a person's scan and takes in what it says, for the app and the scanners alike. Only
 * what is printed on the page counts of what was read (its code says what that is). `storeFile` is
 * asked for the file only when it may be kept, and without one nothing is done (`null`); a page that says nothing new is taken in all the same,
 * as an earlier attempt may have stopped after keeping it.
 */
export async function takeInPage({
	participantId,
	page,
	readings,
	storeFile,
	...scan
}: Pick<Parameters<typeof keepPostalScan>[0], 'page' | 'source' | 'uploadedById'> & {
	participantId: string;
	readings: FieldReading[] | null;
	storeFile: () => Promise<string | null | undefined>;
}): Promise<KeptOutcome | null> {
	const conferenceParticipantId = participantId;
	const printed = readings?.filter(({ field }) => page.fields.includes(field)) ?? null;
	const known = await findPostalScan({ conferenceParticipantId, pageKey: page.pageKey });
	let outcome = judgeRescan({ known, readings: printed });
	if (outcome === 'stored' || outcome === 'replaced') {
		const fileId = await storeFile();
		if (!fileId) return null;
		// judged again under its lock
		outcome = await keepPostalScan({
			...scan,
			conferenceParticipantId,
			fileId,
			page,
			readings: printed
		});
	}
	await applyPaperReadings({ participantId, readings: printed ?? [], confirm: false });
	return outcome;
}
