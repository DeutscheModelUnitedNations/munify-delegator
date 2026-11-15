import { PARTICIPANT_CARE_ROLES } from '#lib/helpers/teamRoles';
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

/** A team member as far as the inboxes ask: their role and their committee functions. */
export interface InboxMember {
	id: string;
	userId: string;
	role: string;
	functions: readonly { committeeId: string | null; kind: string }[];
}

const careRoles: readonly string[] = PARTICIPANT_CARE_ROLES;

/**
 * Whether a team member answers an inbox: participant care by role, a committee's by function,
 * the trusted persons their shared one and each the chats written to them alone.
 */
export function answersInbox({ member, inbox }: { member: InboxMember; inbox: UnreadInbox }) {
	if (inbox.inbox === 'PARTICIPANT_CARE') return careRoles.includes(member.role);
	if (inbox.trustedUserId !== null && inbox.trustedUserId !== member.userId) return false;
	return member.functions.some(
		(held) => held.kind === inbox.inbox && held.committeeId === inbox.committeeId
	);
}

/**
 * Per team member, the oldest unread message of the inboxes they answer: an inbox's unread
 * messages are everybody's who answers it.
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
		for (const member of members.filter((member) => answersInbox({ member, inbox }))) {
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
