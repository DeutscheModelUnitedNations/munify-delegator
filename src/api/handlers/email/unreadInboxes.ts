import { PARTICIPANT_CARE_ROLES } from '#lib/helpers/teamRoles';
import type { SnapshotUnreadMessage } from './dueEmails';

/** The oldest message a team inbox has not read. */
export interface UnreadInbox {
	inbox: 'PARTICIPANT_CARE' | 'CHAIR' | 'CONSULTANT';
	committeeId: string | null;
	messageId: string;
	writtenAt: Date;
}

/** A team member as far as the inboxes ask: their role and their committee functions. */
export interface InboxMember {
	id: string;
	role: string;
	functions: readonly { committeeId: string; kind: string }[];
}

const careRoles: readonly string[] = PARTICIPANT_CARE_ROLES;

/** Whether a team member answers an inbox: participant care by role, a committee's by function. */
export function answersInbox({ member, inbox }: { member: InboxMember; inbox: UnreadInbox }) {
	if (inbox.inbox === 'PARTICIPANT_CARE') return careRoles.includes(member.role);
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
