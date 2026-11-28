import { client } from '#lib/api/rumbleClient/client';
import formatNames from '#lib/helpers/formatNames';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';
import { keepScan } from '#lib/components/postal/uploadScan';
import type { CameraPage } from '#lib/components/scanner/pageCamera.svelte';
import { userIdOfCode } from '#lib/components/scanner/scanAcceptance';
import type { KeptOutcome } from '#lib/paperScan/intake/rescan';
import { contentKeyOf, hashOf } from '#lib/paperScan/intake/scanFile';
import { fieldsOfCode } from '#lib/paperScan/readScan';
import { errorToastMessage } from '#lib/utils/toast';

/**
 * Taking in the pages the camera reads, each by itself as it comes, unattended as a batch is
 * (`importPostalScan`): the photo is kept as the person's scan, what is clear is entered, nothing is
 * set back. Nobody confirms anything; a person only looks at what went wrong.
 */

/** What became of a page the camera read: whose it is, and what a person has to look at. */
export interface CameraTaken {
	userId: string;
	outcome: KeptOutcome | 'failed';
	/** What a person has to look at, if anything. */
	problem?: string;
	/** Whether the camera has to say so yet: it told of unclear fields itself, when it read them. */
	newProblem: boolean;
}

/** A page the camera read, as listed: whose it is, by name, and what became of it. */
export type CameraLogEntry = CameraTaken & { id: number; name: string };

/** What is left for a person of a page read and kept as it was. */
function problemOf({ outcome, readings }: Pick<CameraPage, 'readings'> & { outcome: KeptOutcome }) {
	if (outcome === 'differs') return { problem: m.paperCameraDiffers(), newProblem: true };
	if (!readings) return { problem: m.paperPageNotReadable(), newProblem: false };
	const unclear = readings.some(({ state }) => state === 'unclear');
	return unclear ? { problem: m.paperCameraUnclear(), newProblem: false } : { newProblem: false };
}

/** Keeps a page the camera read as a scan of its person, and enters what it says. */
export async function takeCameraPage({
	page: { code, readings, file },
	conferenceId
}: {
	page: CameraPage;
	conferenceId: string;
}): Promise<CameraTaken> {
	const userId = userIdOfCode(code);
	try {
		const page = { page: 1, code, fields: fieldsOfCode(code), readings };
		const contentKey = contentKeyOf({ hash: await hashOf(file.bytes), page: 1 });
		const args = { userId, page, contentKey, file };
		const outcome = await keepScan({ args, source: 'CAMERA', conferenceId });
		return { userId, outcome, ...problemOf({ outcome, readings }) };
	} catch (error) {
		logger.warn('Keeping a photographed page failed', error);
		return { userId, outcome: 'failed', problem: errorToastMessage(error), newProblem: true };
	}
}

/** The name a page's person is listed by; their id where it cannot be loaded. */
export async function nameOfUser(userId: string) {
	try {
		const user = await client.query.user({
			__args: { id: userId },
			givenName: true,
			familyName: true
		});
		const name = formatNames({
			givenName: user?.givenName ?? undefined,
			familyName: user?.familyName ?? undefined
		});
		return name || userId;
	} catch {
		return userId;
	}
}
