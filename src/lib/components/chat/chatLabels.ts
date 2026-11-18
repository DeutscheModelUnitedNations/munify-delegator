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

/** A team inbox as the labels read it: its kind, a committee's abbreviation, one trusted person's name. */
export interface InboxLabelSource {
	inbox: ChatInbox;
	committeeAbbreviation?: string | null;
	/** The one trusted person the inbox is; empty for all of them together */
	personName?: string | null;
}

const joined = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ');

/**
 * A team inbox: participant care, a committee's chairs or consultants, the trusted persons
 * together or one of them by name.
 */
export function inboxName({ inbox, committeeAbbreviation, personName }: InboxLabelSource) {
	if (inbox === 'PARTICIPANT_CARE') return m.chatInboxParticipantCare();
	if (inbox === 'TRUSTED_PERSON') {
		return personName
			? joined(m.chatInboxTrustedPerson(), personName)
			: m.chatInboxTrustedPersons();
	}
	const name = inbox === 'CHAIR' ? m.chatInboxChairs() : m.chatInboxConsultants();
	return joined(name, committeeAbbreviation);
}

/** What the inbox is there for, under its name in the picker. */
export function inboxDescription({ inbox, personName }: InboxLabelSource) {
	if (inbox === 'PARTICIPANT_CARE') return m.chatInboxParticipantCareDescription();
	if (inbox === 'TRUSTED_PERSON') {
		return personName
			? m.chatInboxTrustedPersonDescription()
			: m.chatInboxTrustedPersonsDescription();
	}
	return inbox === 'CHAIR' ? m.chatInboxChairsDescription() : m.chatInboxConsultantsDescription();
}

export const INBOX_ICON: Record<ChatInbox, string> = {
	PARTICIPANT_CARE: 'lifebuoy',
	CHAIR: 'gavel',
	CONSULTANT: 'chalkboard-teacher',
	TRUSTED_PERSON: 'hand-heart'
};

/** The inbox of a team chat as the labels read it. */
function inboxOfChat(chat: {
	inbox: ChatInbox;
	committee?: { abbreviation: string } | null;
	trustedPersonName?: string | null;
}): InboxLabelSource {
	return {
		inbox: chat.inbox,
		committeeAbbreviation: chat.committee?.abbreviation,
		personName: chat.trustedPersonName
	};
}

/** A chat as the lists and the thread header read it. */
export interface ChatLabelSource {
	kind: ChatKind;
	side: string;
	inbox?: ChatInbox | null;
	committee?: { abbreviation: string } | null;
	/** A chat with one trusted person: their name */
	trustedPersonName?: string | null;
	contacts: readonly ContactLabelSource[];
	people?: readonly { name: string }[];
}

const isSide = (side: string): side is ChatSide =>
	side === 'PARTICIPANT' || side === 'TEAM' || side === 'REVIEW';

/** The caller's side of a chat; the API answers it as a string. */
export function sideOf(chat: { side: string }): ChatSide {
	return isSide(chat.side) ? chat.side : 'REVIEW';
}

/** Who reads a chat with the trusted persons: all of them, or the one it is written to. */
function trustedHint(personName: string | null | undefined) {
	return personName ? m.chatTrustedPersonalHint({ name: personName }) : m.chatTrustedSharedHint();
}

/** What a chat is, in a line, for a chat that has no subtitle of its own. */
export function kindHint(chat: Pick<ChatLabelSource, 'kind' | 'inbox' | 'trustedPersonName'>) {
	if (chat.kind === 'DIRECT') return m.chatDirectHint();
	if (chat.kind === 'DELEGATION') return m.chatDelegationHint();
	return chat.inbox === 'TRUSTED_PERSON' ? trustedHint(chat.trustedPersonName) : m.chatTeamHint();
}

/**
 * The badge a chat carries in a list: "reported" for participant care reading it under a report,
 * its inbox for the team in a list mixing several inboxes, none otherwise.
 */
export function listBadge({
	chat,
	showInbox
}: {
	chat: {
		side: string;
		underReview: boolean;
		inbox?: ChatInbox | null;
		trustedPersonName?: string | null;
	};
	showInbox: boolean;
}): 'reported' | { inbox: ChatInbox; own: boolean } | null {
	const side = sideOf(chat);
	if (chat.underReview && side === 'REVIEW') return 'reported';
	// a chat with one trusted person is only read by them: "to me personally"
	if (showInbox && chat.inbox && side === 'TEAM') {
		return { inbox: chat.inbox, own: !!chat.trustedPersonName };
	}
	return null;
}

/** What a chat is called for the caller: the other party, their delegation, or the team inbox. */
export function chatTitle(chat: ChatLabelSource) {
	const side = sideOf(chat);
	if (chat.kind === 'DELEGATION') {
		if (side === 'PARTICIPANT') return m.chatMyDelegation();
		// participant care is told whose group it is: the members share the delegation's role
		const [member] = chat.contacts;
		return member ? m.chatDelegationOf({ role: contactName(member) }) : m.chatDelegationGroup();
	}
	if (chat.kind === 'TEAM' && side === 'PARTICIPANT' && chat.inbox) {
		return inboxName(inboxOfChat({ ...chat, inbox: chat.inbox }));
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
	const names = (chat.people ?? [])
		.map((person) => person.name)
		.join(chat.kind === 'DELEGATION' ? ', ' : ' ↔ ');
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
