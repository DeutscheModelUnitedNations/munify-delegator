import { db } from '#api/db/db';
import { logger } from '#lib/logger';
import {
	sendPaperSubmittedEmails,
	type SubmittedPaper
} from '#api/handlers/email/paperSubmittedEmail';
import { tellPaperOnSlack } from '#api/handlers/notification/slackNotifications';

/**
 * Tells a committee's chairs and consultants on the paper team that a version of a paper was
 * submitted there, by mail and on Slack, each as they chose. Only papers on an agenda item reach a
 * committee: an introduction paper tells nobody.
 */

type PaperStatus = SubmittedPaper['status'];

/**
 * The submitted version `versionId` as its notifications describe it, with the `status` it was
 * saved with (a review may have changed the row since); undefined without a committee.
 */
async function loadSubmittedPaper({
	versionId,
	status
}: {
	versionId: string;
	status: PaperStatus;
}): Promise<SubmittedPaper | undefined> {
	const version = await db.query.paperVersion.findFirst({
		where: { id: versionId },
		columns: { id: true, version: true },
		with: {
			paper: {
				columns: { id: true, type: true },
				with: {
					agendaItem: {
						columns: { title: true },
						with: { committee: { columns: { id: true, abbreviation: true } } }
					},
					delegation: {
						columns: { conferenceId: true },
						with: {
							conference: { columns: { title: true } },
							assignedRole: {
								columns: { id: true, kind: true, name: true, nationAlpha3Code: true }
							}
						}
					}
				}
			}
		}
	});
	const paper = version?.paper;
	const committee = paper?.agendaItem?.committee;
	if (!version || !paper?.agendaItem || !committee || !paper.delegation.conference)
		return undefined;
	return {
		paperId: paper.id,
		versionId: version.id,
		conferenceId: paper.delegation.conferenceId,
		conferenceTitle: paper.delegation.conference.title,
		committeeId: committee.id,
		committeeAbbreviation: committee.abbreviation,
		agendaItem: paper.agendaItem.title,
		type: paper.type,
		status,
		version: version.version,
		role: paper.delegation.assignedRole ?? null
	};
}

interface Submission {
	versionId: string;
	/** The status the version was saved with: SUBMITTED, or REVISED after a review. */
	status: PaperStatus;
	origin: string;
}

async function announce({ versionId, status, origin }: Submission) {
	const paper = await loadSubmittedPaper({ versionId, status });
	if (!paper) return;
	tellPaperOnSlack({ paper, origin });
	await sendPaperSubmittedEmails({ paper, origin });
}

/**
 * Tells the committee of a submitted version, in the background after it was saved: the paper is
 * submitted whether or not anybody hears of it.
 */
export function announcePaperSubmission(args: Submission) {
	void announce(args).catch((error: unknown) =>
		logger.error('Telling the committee of a submitted paper failed', error)
	);
}
