import { m } from '#lib/paraglide/messages';
import type { NotificationTopic } from '#lib/helpers/teamNotifications';

/** What a notification topic is called: on the settings page and in the Slack messages. */
export function notificationTopicLabel({
	topic,
	functionKind,
	committeeAbbreviation
}: {
	topic: NotificationTopic;
	/** `COMMITTEE_INBOX` / `COMMITTEE_PAPERS`: the function whose topic it is, and its committee. */
	functionKind?: string | null;
	committeeAbbreviation?: string | null;
}) {
	switch (topic) {
		case 'PARTICIPANT_CARE':
			return m.chatInboxParticipantCare();
		case 'COMMITTEE_INBOX': {
			const inbox = functionKind === 'CONSULTANT' ? m.chatInboxConsultants() : m.chatInboxChairs();
			return committeeAbbreviation ? `${inbox} ${committeeAbbreviation}` : inbox;
		}
		case 'TRUSTED_SHARED':
			return m.chatInboxTrustedPersons();
		case 'TRUSTED_PERSONAL':
			return m.notificationTopicTrustedPersonal();
		case 'CHAT_REPORT':
			return m.notificationTopicChatReport();
		case 'COMMITTEE_PAPERS': {
			const papers =
				functionKind === 'CONSULTANT'
					? m.notificationTopicConsultantPapers()
					: m.notificationTopicChairPapers();
			return committeeAbbreviation ? `${papers} ${committeeAbbreviation}` : papers;
		}
	}
}
