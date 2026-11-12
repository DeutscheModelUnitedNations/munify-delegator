import { m } from '#lib/paraglide/messages';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import type { ChatInbox, ChatKind, ChatSide } from '#lib/helpers/chat';

/**
 * How the chats name the people and inboxes in them. Participants appear by role (`Germany · GA`),
 * never by name; a team inbox by its function and committee.
 */

/** A seated person as `ChatContact` describes them. */
export interface ContactLabelSource {
	roleKind: string;
	nationAlpha3Code?: string | null;
	nationAlpha2Code?: string | null;
	roleName?: string | null;
	roleAbbreviation?: string | null;
	roleIcon?: string | null;
	committeeAbbreviation?: string | null;
	committeeName?: string | null;
	ordinal?: number | null;
}

/** The role's name: the nation in the reader's language, or the role's own. */
export function contactName(contact: ContactLabelSource) {
	return contact.nationAlpha3Code
		? getFullTranslatedCountryNameFromISO3Code(contact.nationAlpha3Code)
		: (contact.roleName ?? m.chatUnknownRole());
}

/**
 * What sets the person apart beside the role: their committee, and their number among several
 * sharing both. Empty for a role that says it all.
 */
export function contactDetail(contact: ContactLabelSource) {
	const ordinal = contact.ordinal ? m.chatContactOrdinal({ number: contact.ordinal }) : undefined;
	return [contact.committeeAbbreviation, ordinal].filter(Boolean).join(' · ');
}

/** `Germany · GA`. */
export function contactLabel(contact: ContactLabelSource) {
	return [contactName(contact), contactDetail(contact)].filter(Boolean).join(' · ');
}

/** A team inbox: participant care, or a committee's chairs or consultants. */
export function inboxName({
	inbox,
	committeeAbbreviation
}: {
	inbox: ChatInbox;
	committeeAbbreviation?: string | null;
}) {
	if (inbox === 'PARTICIPANT_CARE') return m.chatInboxParticipantCare();
	const name = inbox === 'CHAIR' ? m.chatInboxChairs() : m.chatInboxConsultants();
	return committeeAbbreviation ? `${name} · ${committeeAbbreviation}` : name;
}

/** What the inbox is there for, under its name in the picker. */
export function inboxDescription(inbox: ChatInbox) {
	if (inbox === 'PARTICIPANT_CARE') return m.chatInboxParticipantCareDescription();
	return inbox === 'CHAIR' ? m.chatInboxChairsDescription() : m.chatInboxConsultantsDescription();
}

export const INBOX_ICON: Record<ChatInbox, string> = {
	PARTICIPANT_CARE: 'lifebuoy',
	CHAIR: 'gavel',
	CONSULTANT: 'chalkboard-teacher'
};

/** A chat as the lists and the thread header read it. */
export interface ChatLabelSource {
	kind: ChatKind;
	side: string;
	inbox?: ChatInbox | null;
	committee?: { abbreviation: string } | null;
	contacts: readonly ContactLabelSource[];
	people?: readonly { name: string }[];
}

const isSide = (side: string): side is ChatSide =>
	side === 'PARTICIPANT' || side === 'TEAM' || side === 'REVIEW';

/** The caller's side of a chat; the API answers it as a string. */
export function sideOf(chat: { side: string }): ChatSide {
	return isSide(chat.side) ? chat.side : 'REVIEW';
}

/** What a chat is called for the caller: the other party, their delegation, or the team inbox. */
export function chatTitle(chat: ChatLabelSource) {
	const side = sideOf(chat);
	if (chat.kind === 'DELEGATION') {
		return side === 'PARTICIPANT' ? m.chatMyDelegation() : m.chatDelegationGroup();
	}
	if (chat.kind === 'TEAM' && side === 'PARTICIPANT' && chat.inbox) {
		return inboxName({ inbox: chat.inbox, committeeAbbreviation: chat.committee?.abbreviation });
	}
	const [first, second] = chat.contacts;
	if (!first) return chat.people?.[0]?.name ?? m.chatFormerParticipant();
	// participant care reviewing a direct chat sees both parties
	return second ? `${contactLabel(first)} ↔ ${contactLabel(second)}` : contactLabel(first);
}

/** What stands under the title: the names for participant care, the inbox for the team. */
export function chatSubtitle(chat: ChatLabelSource) {
	const side = sideOf(chat);
	if (side === 'PARTICIPANT') return undefined;
	const names = (chat.people ?? []).map((person) => person.name).join(' ↔ ');
	return names || undefined;
}

/** The picture of a chat: a flag, or an icon. */
export function chatAvatar(chat: ChatLabelSource): { alpha2Code: string } | { icon: string } {
	if (chat.kind === 'DELEGATION') return { icon: 'users-three' };
	if (chat.kind === 'TEAM' && sideOf(chat) === 'PARTICIPANT' && chat.inbox) {
		return { icon: INBOX_ICON[chat.inbox] };
	}
	const [contact] = chat.contacts;
	return contact ? contactAvatar(contact) : { icon: 'user' };
}

export function contactAvatar(
	contact: ContactLabelSource
): { alpha2Code: string } | { icon: string } {
	if (contact.nationAlpha2Code) return { alpha2Code: contact.nationAlpha2Code.toLowerCase() };
	return { icon: contact.roleIcon ?? (contact.roleKind === 'CUSTOM' ? 'user-focus' : 'megaphone') };
}

const normalize = (text: string) => text.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Everything a contact can be found by: the role in the reader's language, its short name, the committee. */
export function contactSearchText(contact: ContactLabelSource) {
	return normalize(
		[
			contactName(contact),
			contact.roleAbbreviation,
			contact.nationAlpha3Code,
			contact.committeeAbbreviation,
			contact.committeeName
		]
			.filter(Boolean)
			.join(' ')
	);
}

/**
 * Whether every word of the search is found in `haystack` (`contactSearchText`), so "ger ga"
 * finds Germany in the General Assembly.
 */
export function matchesSearch({ haystack, search }: { haystack: string; search: string }) {
	return normalize(search)
		.split(/\s+/)
		.filter(Boolean)
		.every((word) => haystack.includes(word));
}

/** The chats holding something unread, and how many messages that is in all. */
export function unreadChats<C extends { unreadCount: number }>(chats: readonly C[]) {
	const unread = chats.filter((chat) => chat.unreadCount > 0);
	return { unread, total: unread.reduce((sum, chat) => sum + chat.unreadCount, 0) };
}
