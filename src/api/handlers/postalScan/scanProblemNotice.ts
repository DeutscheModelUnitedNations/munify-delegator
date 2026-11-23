import { APP_URL } from '$app/env/private';
import { db } from '#api/db/db';
import { sendScanProblemEmail, type ScanProblemNotice } from '#api/handlers/email/scanProblemEmail';
import { tellScanProblemOnSlack } from '#api/handlers/notification/slackNotifications';
import type { Deliverer } from '#api/handlers/scannerAccess/scannerAccessService';
import { logger } from '#lib/logger';
import { describeScanProblem, type ScanProblem } from '#lib/paperScan/intake/people';

/** More lines than this help nobody: the scanner's whole stack went wrong. */
const MAX_LINES = 20;

async function tell({ problems, deliverer }: { problems: ScanProblem[]; deliverer: Deliverer }) {
	const { conferenceId, teamMemberId, accessName } = deliverer;
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { title: true }
	});
	if (!conference) return;
	const notice: ScanProblemNotice = {
		conferenceId,
		conferenceTitle: conference.title,
		scanner: accessName,
		problems: () => {
			const lines = problems.map(describeScanProblem);
			return lines.length > MAX_LINES ? [...lines.slice(0, MAX_LINES), '…'] : lines;
		}
	};
	await Promise.all([
		sendScanProblemEmail({ teamMemberId, notice, origin: APP_URL }),
		tellScanProblemOnSlack({ teamMemberId, notice, origin: APP_URL })
	]);
}

/** Tells a scanner's owner what came to nothing of a delivery, in the background. */
export function tellScanProblems(args: Parameters<typeof tell>[0]) {
	void tell(args).catch((error: unknown) => logger.error('Telling a scan problem failed', error));
}
