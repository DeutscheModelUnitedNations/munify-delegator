import { APP_URL } from '$app/env/private';
import { db } from '#api/db/db';
import { sendScanProblemEmail, type ScanProblemNotice } from '#api/handlers/email/scanProblemEmail';
import { tellScanProblemOnSlack } from '#api/handlers/notification/slackNotifications';
import type { DeliveryConference } from '#api/handlers/scannerAccess/scannerAccessPermissions';
import { describeScanProblem, type ScanProblem } from '#lib/paperScan/intake/problems';

/** More lines than this help nobody: the scanner's whole stack went wrong. */
const MAX_LINES = 20;

/** Tells a scanner's owner in one of their conferences, as they want to be told of it there. */
async function tellIn({
	conference: { conferenceId, teamMemberId },
	problems,
	scanner
}: {
	conference: DeliveryConference;
	problems: readonly ScanProblem[];
	scanner: string;
}): Promise<'told' | 'unwanted' | 'failed'> {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { title: true }
	});
	if (!conference) return 'unwanted';
	const notice: ScanProblemNotice = {
		conferenceId,
		conferenceTitle: conference.title,
		scanner,
		problems: () => {
			const lines = problems.map(describeScanProblem);
			return lines.length > MAX_LINES ? [...lines.slice(0, MAX_LINES), '…'] : lines;
		}
	};
	const onSlack = await tellScanProblemOnSlack({ teamMemberId, notice, origin: APP_URL });
	const mail = await sendScanProblemEmail({ teamMemberId, notice, origin: APP_URL });
	if (onSlack || mail === 'sent') return 'told';
	return mail;
}

/**
 * Tells a scanner's owner what came to nothing of a delivery: in the conference it is of, as they want to
 * be told there; what is of none they know goes along, or else to the first of their conferences (the
 * latest first) where they want to hear of it. Throws when they wanted a mail, it failed, and nothing else
 * reached them either.
 */
export async function tellScanProblems({
	problems,
	scanner,
	conferences
}: {
	problems: readonly ScanProblem[];
	scanner: string;
	conferences: readonly DeliveryConference[];
}) {
	const problemsOf = (conferenceId: string) =>
		problems.filter((problem) => problem.conferenceId === conferenceId);
	const concerned = conferences.filter(({ conferenceId }) => problemsOf(conferenceId).length > 0);
	const others = conferences.filter((conference) => !concerned.includes(conference));
	let unplaced = problems.filter(
		({ conferenceId }) => !concerned.some((conference) => conference.conferenceId === conferenceId)
	);
	let failed = false;
	for (const conference of [...concerned, ...others]) {
		const told = [...problemsOf(conference.conferenceId), ...unplaced];
		if (told.length === 0) continue;
		const result = await tellIn({ conference, problems: told, scanner });
		failed ||= result === 'failed';
		// on to the next only where they do not want to hear of it: a mail that failed is tried again
		if (result !== 'unwanted') unplaced = [];
	}
	if (failed) throw new Error('The owner of a scanner could not be told');
}
