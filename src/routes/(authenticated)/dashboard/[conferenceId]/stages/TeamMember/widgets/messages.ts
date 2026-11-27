import { groupName, inboxName, sideOf } from '#lib/components/chat/chatLabels';
import type { ChatInbox, ChatKind } from '#lib/helpers/chat';

/**
 * The messages widget's figures: the unread messages of the team's side per inbox (or group),
 * and since when the longest-waiting of them waits. Pure, so the grouping is tested.
 */

export interface WidgetChat {
	kind: ChatKind;
	inbox?: ChatInbox | null;
	side: string;
	unreadCount: number;
	/** `TEAM`: when the participant last wrote */
	lastParticipantMessageAt?: Date | string | null;
	lastMessageAt?: Date | string | null;
	trustedPersonName?: string | null;
	committee?: { abbreviation: string } | null;
	role?: { name: string | null } | null;
}

export interface InboxCount {
	label: string;
	unread: number;
}

/** Where a chat waits, as the team reads it: its inbox, its group, or the chats the caller is in. */
function labelOf(chat: WidgetChat, ownChats: string) {
	if (chat.kind === 'TEAM' && chat.inbox) {
		return inboxName({
			inbox: chat.inbox,
			committeeAbbreviation: chat.committee?.abbreviation,
			roleName: chat.role?.name,
			personName: chat.trustedPersonName
		});
	}
	if (chat.kind === 'COMMITTEE' || chat.kind === 'ROLE') {
		return groupName({ kind: chat.kind, committee: chat.committee, role: chat.role });
	}
	return ownChats;
}

/** The team's unread chats: those on its side holding messages nobody read. */
function unreadTeamChats<C extends WidgetChat>(chats: readonly C[]) {
	return chats.filter((chat) => sideOf(chat) === 'TEAM' && chat.unreadCount > 0);
}

/** Unread messages per inbox, most first; `ownChats` names the caller's own chats. */
export function unreadByInbox({
	chats,
	ownChats
}: {
	chats: readonly WidgetChat[];
	ownChats: string;
}): InboxCount[] {
	const counts = new Map<string, number>();
	for (const chat of unreadTeamChats(chats)) {
		const label = labelOf(chat, ownChats);
		counts.set(label, (counts.get(label) ?? 0) + chat.unreadCount);
	}
	return [...counts]
		.map(([label, unread]) => ({ label, unread }))
		.toSorted((a, b) => b.unread - a.unread || a.label.localeCompare(b.label));
}

/**
 * Since when the longest-waiting unread chat waits: the earliest last message of a participant
 * (or, where that is not kept, of anybody) among the team's unread chats.
 */
export function oldestWaiting(chats: readonly WidgetChat[]): Date | undefined {
	const times = unreadTeamChats(chats)
		.map((chat) => chat.lastParticipantMessageAt ?? chat.lastMessageAt)
		.filter((time) => time !== null && time !== undefined)
		.map((time) => new Date(time).getTime());
	return times.length === 0 ? undefined : new Date(Math.min(...times));
}
