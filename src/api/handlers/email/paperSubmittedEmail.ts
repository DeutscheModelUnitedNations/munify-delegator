import { db } from '#api/db/db';
import type * as schema from '#api/db/schema/index';
import { m } from '#lib/paraglide/messages';
import { logger } from '#lib/logger';
import { wantsPaperNotification } from '#lib/helpers/teamNotifications';
import { translatePaperStatus, translatePaperType } from '#lib/utils/enumTranslations';
import { preferencesOfMembers } from '#api/handlers/notification/notificationStore';
import type { SnapshotRole, SnapshotUser } from './dueEmails';
import { roleName } from './emailContent';
import {
	loadWording,
	renderNoticeEmail,
	sendByHand,
	type ConferenceWording
} from './emailDelivery';

/**
 * Tells a committee's chairs and consultants on the paper team that a paper was submitted there:
 * a first submission or a resubmission, each submitted version once. It goes out the moment the
 * version is saved, like the badge found note, logged as sent by hand without a sender, to whoever
 * did not switch it off (`COMMITTEE_PAPERS` in `#lib/helpers/teamNotifications`). Like every team
 * notification it tells what and where, never who: committee, agenda item, type, version and the
 * writing delegation's role, never the author or a word of the paper.
 */

const KIND = 'PAPER_SUBMITTED';

/** A submitted version of a paper, as its notifications describe it. */
export interface SubmittedPaper {
	paperId: string;
	versionId: string;
	conferenceId: string;
	conferenceTitle: string;
	committeeId: string;
	committeeAbbreviation: string;
	agendaItem: string;
	type: (typeof schema.paperType.enumValues)[number];
	/** SUBMITTED for a version handed in before any review, REVISED after one. */
	status: (typeof schema.paperStatus.enumValues)[number];
	version: number;
	/** The role of the delegation that wrote it. */
	role: SnapshotRole | null;
}

/** Where the paper opens. */
export const submittedPaperUrl = ({ origin, paper }: { origin: string; paper: SubmittedPaper }) =>
	`${origin}/dashboard/${paper.conferenceId}/paperhub/${paper.paperId}`;

/**
 * The placeholders of the mail and the Slack message, in the locale they are rendered in. What the
 * team wrote goes through `escape` (the Slack message escapes its control characters).
 */
export function paperSubmissionValues({
	paper,
	escape = (text) => text
}: {
	paper: SubmittedPaper;
	escape?: (text: string) => string;
}) {
	return {
		conference: escape(paper.conferenceTitle),
		committee: escape(paper.committeeAbbreviation),
		paper: escape(paper.agendaItem),
		paperType: translatePaperType(paper.type),
		delegation: escape((paper.role && roleName(paper.role)) || m.emailPaperSubmittedUnknownRole()),
		version: String(paper.version),
		status: translatePaperStatus(paper.status)
	};
}

/** Renders the mail to `recipient` in their language and the conference's own words. */
export function renderPaperSubmittedEmail({
	recipient,
	paper,
	origin,
	wording
}: {
	recipient: SnapshotUser;
	paper: SubmittedPaper;
	origin: string;
	wording: ConferenceWording;
}) {
	return renderNoticeEmail({
		kind: KIND,
		recipient,
		conferenceTitle: paper.conferenceTitle,
		wording,
		values: () => paperSubmissionValues({ paper }),
		button: () => ({
			label: m.emailAutoPaperSubmittedButton(),
			url: submittedPaperUrl({ origin, paper })
		})
	});
}

/** The team members who get the mail about `paper`: the committee's, as far as they want it. */
async function recipientsOf(paper: SubmittedPaper) {
	const members = await db.query.teamMember.findMany({
		where: { conferenceId: paper.conferenceId },
		columns: { id: true, userId: true, role: true },
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
			},
			functions: { columns: { id: true, committeeId: true, kind: true } }
		}
	});
	const preferences = await preferencesOfMembers({
		teamMemberIds: members.map((member) => member.id),
		channel: 'EMAIL'
	});
	return members.filter((member) =>
		wantsPaperNotification({
			member,
			committeeId: paper.committeeId,
			preferences: preferences.get(member.id) ?? [],
			channel: 'EMAIL',
			mailByDefault: member.user.messageNotificationEmails
		})
	);
}

/** Sends the mail about a submitted version to each of the committee's chairs and consultants who want it. */
export async function sendPaperSubmittedEmails({
	paper,
	origin
}: {
	paper: SubmittedPaper;
	origin: string;
}) {
	const recipients = await recipientsOf(paper);
	if (recipients.length === 0) return;
	const wording = await loadWording(paper.conferenceId);
	await Promise.all(
		recipients.map(async ({ id, user }) => {
			const error = await sendByHand({
				conferenceId: paper.conferenceId,
				kind: KIND,
				userId: user.id,
				subjectKey: paper.versionId,
				to: user.email,
				sentById: null,
				render: () => renderPaperSubmittedEmail({ recipient: user, paper, origin, wording })
			});
			if (error)
				logger.warn('Telling a submitted paper by mail failed', { teamMemberId: id, error });
		})
	);
}
