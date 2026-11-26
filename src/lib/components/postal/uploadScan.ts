import { client } from '#lib/api/rumbleClient/client';
import type { PostalscansourceEnum } from '#lib/api/rumbleClient/client';
import { uploadFile } from '#lib/api/uploadFile';
import { m } from '#lib/paraglide/messages';
import { readScanPage } from '#lib/paperScan/intake/pages';
import { describeScanProblem } from '#lib/paperScan/intake/problems';
import { keptOutcomeSchema, type KeptOutcome } from '#lib/paperScan/intake/rescan';
import { blobSource } from '#lib/paperScan/intake/source';
import type { KeepArgs } from '#lib/paperScan/intake/takePage';
import { takeScan } from '#lib/paperScan/intake/takeScan';
import { browserPlatform, checkCode } from './browserScan';

/**
 * Keeps a page as a person's scan and takes in what was read off it. The server says whether it says
 * more than the scan they have of it (`judgeRescan`); if not, nothing is uploaded.
 */
export async function keepScan({
	args: {
		userId,
		page: { code, readings },
		contentKey,
		file: { name, type, bytes }
	},
	source,
	conferenceId
}: {
	args: Pick<KeepArgs<unknown>, 'userId' | 'page' | 'contentKey' | 'file'>;
	source: PostalscansourceEnum;
	conferenceId: string;
}): Promise<KeptOutcome> {
	const take = async (fileId?: string) =>
		keptOutcomeSchema.nullish().parse(
			await Promise.resolve(
				client.mutate.importPostalScan({
					__args: { conferenceId, userId, fileId, source, code, contentKey, readings }
				})
			)
		);
	const known = await take();
	if (known) return known;

	const fileId = await uploadFile({
		file: new File([bytes], name, { type }),
		target: { kind: 'postalScan', field: 'scan', conferenceId }
	});
	const kept = fileId && (await take(fileId));
	if (!kept) throw new Error(m.paperFileUnreadable());
	return kept;
}

/**
 * Keeps the pages of a file as the scans of the person it is uploaded for, read like any other: a page
 * of somebody else's is refused, one without a readable code is kept as theirs. Throws, worded for a
 * person, when not all of it was kept.
 */
export async function uploadScanFor({
	file,
	conferenceId,
	userId
}: {
	file: File;
	conferenceId: string;
	userId: string;
}) {
	const { people, problems } = await takeScan({
		file: { name: file.name, source: blobSource(file) },
		conferenceIds: new Set([conferenceId]),
		owner: { userId, conferenceId },
		ports: {
			read: (scan) => readScanPage({ scan, platform: browserPlatform }),
			check: checkCode,
			participant: async () => true,
			keep: async (args) => ({ outcome: await keepScan({ args, source: 'UPLOAD', conferenceId }) })
		}
	});
	const lost = problems.filter(({ reason }) => reason !== 'unreadable');
	if (lost.length === 0 && people.length === 0) throw new Error(m.postalScanEmpty());
	if (lost.length > 0) throw new Error(lost.map(describeScanProblem).join(' · '));
}
