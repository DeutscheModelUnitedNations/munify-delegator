import { m } from '#lib/paraglide/messages';
import type { NotificationTopic } from '#lib/helpers/teamNotifications';

/** What a notification topic is called: on the settings page and in the Slack messages. */
export function notificationTopicLabel({
	topic,
	functionKind,
	committeeAbbreviation,
	roleName
}: {
	topic: NotificationTopic;
	/**
	 * `COMMITTEE_INBOX` / `COMMITTEE_PAPERS` / `CHAT_GROUP`: the function whose topic it is, and its
	 * committee or (`ROLE_INBOX`, `CHAT_GROUP`) custom role.
	 */
	functionKind?: string | null;
	committeeAbbreviation?: string | null;
	roleName?: string | null;
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
		case 'SCAN_PROBLEM':
			return m.notificationTopicScanProblem();
		case 'ROLE_INBOX':
			return m.chatInboxRoleSupport({ role: roleName ?? '' });
		case 'CHAT_GROUP':
			return functionKind === 'ROLE_SUPPORT'
				? m.notificationTopicRoleGroup({ role: roleName ?? '' })
				: m.notificationTopicCommitteeGroup({ committee: committeeAbbreviation ?? '' });
		case 'COMMITTEE_PAPERS': {
			const papers =
				functionKind === 'CONSULTANT'
					? m.notificationTopicConsultantPapers()
					: m.notificationTopicChairPapers();
			return committeeAbbreviation ? `${papers} ${committeeAbbreviation}` : papers;
		}
	}
}
