import {
	topicOfInbox,
	wantsNotification,
	type NotifiedMember,
	type StoredPreference
} from '#lib/helpers/teamNotifications';
import type { ChatInbox } from '#lib/helpers/chat';
import type { SnapshotUnreadMessage } from './dueEmails';

/** The oldest message a team inbox has not read. */
export interface UnreadInbox {
	inbox: ChatInbox;
	committeeId: string | null;
	/** A chat with one trusted person: only theirs to read */
	trustedUserId: string | null;
	messageId: string;
	writtenAt: Date;
}

/** A team member as far as the inboxes ask: their role, functions and notification choices. */
export interface InboxMember extends NotifiedMember {
	id: string;
	preferences: readonly StoredPreference[];
	/** `user.messageNotificationEmails`: mail is on by default unless they switched it off before. */
	mailByDefault: boolean;
}

/**
 * Whether a team member answers an inbox: participant care by role, a committee's by function,
 * the trusted persons their shared one and each the chats written to them alone.
 */
export const answersInbox = ({ member, inbox }: { member: NotifiedMember; inbox: UnreadInbox }) =>
	topicOfInbox({ member, inbox }) !== null;

/** Whether a member wants a mail about the inbox: they answer it and did not switch its mail off. */
function wantsInboxMail({ member, inbox }: { member: InboxMember; inbox: UnreadInbox }) {
	const key = topicOfInbox({ member, inbox });
	return (
		key !== null &&
		wantsNotification({
			preferences: member.preferences,
			key,
			channel: 'EMAIL',
			mailByDefault: member.mailByDefault
		})
	);
}

/**
 * Per team member, the oldest unread message of the inboxes they answer and want mail about: an
 * inbox's unread messages are everybody's who answers it.
 */
export function oldestUnreadPerMember({
	inboxes,
	members
}: {
	inboxes: readonly UnreadInbox[];
	members: readonly InboxMember[];
}): SnapshotUnreadMessage[] {
	const oldest = new Map<string, UnreadInbox>();
	for (const inbox of inboxes) {
		for (const member of members.filter((member) => wantsInboxMail({ member, inbox }))) {
			const known = oldest.get(member.id);
			if (!known || inbox.writtenAt < known.writtenAt) oldest.set(member.id, inbox);
		}
	}
	return [...oldest].map(([teamMemberId, { messageId, writtenAt }]) => ({
		messageId,
		writtenAt,
		reader: { teamMemberId }
	}));
}
