import { db } from '#api/db/db';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';
import { wantsNotification } from '#lib/helpers/teamNotifications';
import { preferencesOfMembers } from '#api/handlers/notification/notificationStore';
import { nanoid } from '#lib/helpers/nanoid';
import { describeScanProblem } from '#lib/paperScan/intake/people';
import type { SnapshotUser } from './dueEmails';
import {
	loadWording,
	renderNoticeEmail,
	sendByHand,
	type ConferenceWording
} from './emailDelivery';

/**
 * Tells a team member that their scanner delivered pages nobody could be found for, or that could
 * not be read: nothing of those is kept, so the paper has to be scanned again. It goes out as the
 * delivery is taken in, logged as sent by hand without a sender, unless they switched it off
 * (`SCAN_PROBLEM` in `#lib/helpers/teamNotifications`).
 */

const KIND = 'SCAN_PROBLEM';

/** A delivery's problems as its notifications describe them. */
export interface ScanProblemNotice {
	conferenceId: string;
	conferenceTitle: string;
	/** What the owner calls the scanner. */
	scanner: string;
	/** A line per problem, in the locale it is asked in. */
	problems: () => string[];
}

/** The delivery a test about scan problems, or a preview of its mail, describes. */
export const sampleScanProblem = ({
	conferenceId,
	conferenceTitle
}: {
	conferenceId: string;
	conferenceTitle: string;
}): ScanProblemNotice => ({
	conferenceId,
	conferenceTitle,
	scanner: m.scannerAccessNameSample(),
	problems: () => [describeScanProblem({ file: 'scan.pdf', pages: [3, 4], reason: 'noCode' })]
});

/** Where the paper is scanned again. */
export const scanPageUrl = ({ origin, conferenceId }: { origin: string; conferenceId: string }) =>
	`${origin}/dashboard/${conferenceId}/team/postal-registration`;

/** Renders the mail to `recipient` in their language and the conference's own words. */
export function renderScanProblemEmail({
	recipient,
	notice,
	origin,
	wording
}: {
	recipient: SnapshotUser;
	notice: ScanProblemNotice;
	/** Without the app's address there is no link. */
	origin: string | undefined;
	wording: ConferenceWording;
}) {
	return renderNoticeEmail({
		kind: KIND,
		recipient,
		conferenceTitle: notice.conferenceTitle,
		wording,
		values: () => ({ scanner: notice.scanner }),
		items: notice.problems,
		button: origin
			? () => ({
					label: m.emailAutoScanProblemButton(),
					url: scanPageUrl({ origin, conferenceId: notice.conferenceId })
				})
			: undefined
	});
}

/** Sends the mail to the scanner's owner, if they want it. */
export async function sendScanProblemEmail({
	teamMemberId,
	notice,
	origin
}: {
	teamMemberId: string;
	notice: ScanProblemNotice;
	origin: string | undefined;
}) {
	const member = await db.query.teamMember.findFirst({
		where: { id: teamMemberId },
		columns: { id: true },
		with: {
			user: {
				columns: {
					id: true,
					email: true,
					givenName: true,
					familyName: true,
					locale: true,
					birthday: true,
					messageNotificationEmails: true
				}
			}
		}
	});
	if (!member) return;
	const preferences = await preferencesOfMembers({
		teamMemberIds: [teamMemberId],
		channel: 'EMAIL'
	});
	const wanted = wantsNotification({
		preferences: preferences.get(teamMemberId) ?? [],
		key: { topic: KIND, teamFunctionId: null },
		channel: 'EMAIL',
		mailByDefault: member.user.messageNotificationEmails
	});
	if (!wanted) return;
	const wording = await loadWording(notice.conferenceId);
	const error = await sendByHand({
		conferenceId: notice.conferenceId,
		kind: KIND,
		userId: member.user.id,
		subjectKey: nanoid(),
		to: member.user.email,
		sentById: null,
		render: () => renderScanProblemEmail({ recipient: member.user, notice, origin, wording })
	});
	if (error) logger.warn('Telling a scan problem by mail failed', { teamMemberId, error });
}
