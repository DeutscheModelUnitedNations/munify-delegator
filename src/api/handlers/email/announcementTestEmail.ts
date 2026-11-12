import { db } from '#api/db/db';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { announcementMail } from './dueEmails';
import { loadEmailConference } from './emailSnapshot';
import { loadWording, renderAutomaticEmail, sendByHand } from './emailDelivery';
import { MAIL_USER, mailedAnnouncement, WITH_ATTACHMENTS } from './announcementEmails';

/**
 * Sends the announcement's mail to `userId` alone, as its audience would get it, whatever its
 * state: the editor's test. Logged as sent by hand. CONFLICT when the mail service refuses it.
 */
export async function sendAnnouncementTestMail({
	announcementId,
	userId,
	origin
}: {
	announcementId: string;
	userId: string;
	origin: string;
}) {
	const [row, recipient] = await Promise.all([
		db.query.announcement.findFirst({ where: { id: announcementId }, with: WITH_ATTACHMENTS }),
		db.query.user.findFirst({ where: { id: userId }, ...MAIL_USER })
	]);
	const conference = row && (await loadEmailConference(row.conferenceId));
	if (!row || !recipient || !conference)
		throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	const wording = await loadWording(row.conferenceId);
	const email = announcementMail({ announcement: mailedAnnouncement(row), recipient });
	const error = await sendByHand({
		conferenceId: row.conferenceId,
		kind: 'ANNOUNCEMENT',
		userId,
		subjectKey: `test:${row.id}:${new Date().toISOString()}`,
		to: recipient.email,
		sentById: userId,
		render: () => renderAutomaticEmail({ email, conference, origin, wording })
	});
	if (error !== undefined)
		throw apiError({ code: 'CONFLICT', message: m.announcementTestMailFailed() });
}
