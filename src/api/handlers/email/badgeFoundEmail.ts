import { db } from '#api/db/db';
import type { SnapshotUser } from './dueEmails';
import {
	loadWording,
	renderNoticeEmail,
	sendByHand,
	type ConferenceWording
} from './emailDelivery';

/**
 * Tells someone that the badge they lost was handed in to participant care. Nothing about it is
 * stored: participant care sends it by hand from the user card whenever a badge turns up, and it
 * always goes out, logged like every mail sent by hand. Its text is the conference's own where it
 * wrote one, else the default.
 */

const KIND = 'BADGE_FOUND';

/** Renders the mail to `recipient` in their language and the conference's own words. */
export function renderBadgeFoundEmail({
	recipient,
	conferenceTitle,
	wording
}: {
	recipient: SnapshotUser;
	conferenceTitle: string;
	wording: ConferenceWording;
}) {
	return renderNoticeEmail({ kind: KIND, recipient, conferenceTitle, wording });
}

/**
 * Sends the mail to the person of the participant row `participantId`. Answers why it failed,
 * `null` when it went out, `undefined` when there is no such row.
 */
export async function sendBadgeFoundEmail({
	participantId,
	sentById
}: {
	participantId: string;
	sentById: string;
}) {
	const participant = await db.query.conferenceParticipant.findFirst({
		where: { id: participantId },
		columns: { conferenceId: true },
		with: {
			user: {
				columns: {
					id: true,
					email: true,
					givenName: true,
					familyName: true,
					locale: true,
					birthday: true
				}
			},
			conference: { columns: { title: true } }
		}
	});
	if (!participant?.user || !participant.conference) return undefined;
	const { user, conference, conferenceId } = participant;
	const wording = await loadWording(conferenceId);
	const error = await sendByHand({
		conferenceId,
		kind: KIND,
		userId: user.id,
		subjectKey: new Date().toISOString(),
		to: user.email,
		sentById,
		render: () =>
			renderBadgeFoundEmail({ recipient: user, conferenceTitle: conference.title, wording })
	});
	return error ?? null;
}
