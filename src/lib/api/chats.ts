import type { ChatInbox } from '#lib/helpers/chat';
import { client } from './rumbleClient/client';

/**
 * The chats' shared queries. A chat list and the open thread both read a chat's summary, so the
 * selection lives here once; each component still fetches what it shows itself.
 */

const CONTACT = {
	participantId: true,
	roleKind: true,
	nationAlpha3Code: true,
	nationAlpha2Code: true,
	roleName: true,
	roleAbbreviation: true,
	roleIcon: true,
	committeeId: true,
	committeeAbbreviation: true,
	committeeName: true,
	ordinal: true,
	userId: true,
	suspended: true
} as const;

const CHAT_SUMMARY = {
	id: true,
	kind: true,
	inbox: true,
	side: true,
	committeeId: true,
	lastMessageAt: true,
	lastMessagePreview: true,
	unreadCount: true,
	underReview: true,
	trustedPersonName: true,
	committee: { abbreviation: true, name: true },
	contacts: CONTACT,
	people: { participantId: true, userId: true, name: true }
} as const;

const INBOX = {
	inbox: true,
	committeeId: true,
	committeeAbbreviation: true,
	committeeName: true,
	trustedPersonId: true,
	personName: true,
	chatId: true
} as const;

/** What narrows a chat list down: one inbox of the team, or everything the caller takes part in. */
export interface ChatListFilter {
	inbox?: ChatInbox;
	committeeId?: string | null;
}

/** The caller's chats of a conference that hold a message, the latest first. */
export function fetchChats({
	conferenceId,
	filter = {}
}: {
	conferenceId: string;
	filter?: ChatListFilter;
}) {
	return client.liveQuery.chats({
		__args: {
			where: {
				conferenceId: { eq: conferenceId },
				lastMessageAt: { isNotNull: true },
				...(filter.inbox ? { kind: 'TEAM' as const, inbox: filter.inbox } : {}),
				...(filter.committeeId ? { committeeId: { eq: filter.committeeId } } : {})
			},
			orderBy: { lastMessageAt: 'desc' }
		},
		...CHAT_SUMMARY
	});
}

export type ChatSummary = Awaited<ReturnType<typeof fetchChats>>[number];

/**
 * One chat with what its thread needs on top of the summary, as a live list of one (or none, for a
 * chat the caller cannot read). Read the row through the list (`liveSnapshot`): a row taken out
 * once stays as it was when it was loaded.
 */
export function fetchChat(id: string) {
	return client.liveQuery.chats({
		__args: { where: { id: { eq: id } } },
		...CHAT_SUMMARY,
		conferenceId: true,
		participantId: true,
		blockedByMe: true,
		writeRefusal: true
	});
}

export type OpenChat = Awaited<ReturnType<typeof fetchChat>>[number];

/** The latest `limit` messages of a chat, the newest first. */
export function fetchChatMessages({ chatId, limit }: { chatId: string; limit: number }) {
	return client.liveQuery.chatMessages({
		__args: { where: { chatId: { eq: chatId } }, orderBy: { createdAt: 'desc' }, limit },
		id: true,
		body: true,
		createdAt: true,
		mine: true,
		fromTeam: true,
		authorName: true,
		authorParticipantId: true,
		paperId: true
	});
}

/** Everybody the caller can open a direct chat with. Not live: opened afresh with the picker. */
export function fetchChatContacts(conferenceId: string) {
	return client.query.chatContacts({ __args: { conferenceId }, ...CONTACT });
}

export type ChatContactRow = Awaited<ReturnType<typeof fetchChatContacts>>[number];

/**
 * The team inboxes a chat can be opened with: the caller's own as a participant, or, with
 * `participantId`, the ones the caller answers that reach that person.
 */
export function fetchChatInboxes({
	conferenceId,
	participantId
}: {
	conferenceId: string;
	participantId?: string;
}) {
	return client.liveQuery.chatInboxes({ __args: { conferenceId, participantId }, ...INBOX });
}

export type ChatInboxRow = Awaited<ReturnType<typeof fetchChatInboxes>>[number];

/** The inboxes the caller answers that reach one person, asked once (on a click). */
export function fetchReachingInboxes({
	conferenceId,
	participantId
}: {
	conferenceId: string;
	participantId: string;
}) {
	return client.query.chatInboxes({ __args: { conferenceId, participantId }, ...INBOX });
}

/**
 * Whether the caller answers a team inbox of the conference while its messaging is on: participant
 * care, or a committee function. Decides whether "write to delegate" is offered at all.
 */
export async function fetchAnswersInbox({
	conferenceId,
	userId,
	cares
}: {
	conferenceId: string;
	userId: string;
	cares: boolean;
}) {
	const [conference, functions] = await Promise.all([
		client.liveQuery.conference({ __args: { id: conferenceId }, messagingEnabled: true }),
		client.liveQuery.teamFunctions({
			__args: {
				where: { teamMember: { userId: { eq: userId }, conferenceId: { eq: conferenceId } } }
			},
			kind: true
		})
	]);
	return conference.messagingEnabled && (cares || functions.length > 0);
}
