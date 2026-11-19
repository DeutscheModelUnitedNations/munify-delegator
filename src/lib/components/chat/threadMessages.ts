import { m } from '#lib/paraglide/messages';
import type { ChatInbox, ChatKind, ChatSide } from '#lib/helpers/chat';
import { contactLabel, inboxName, type ContactLabelSource } from './chatLabels';
import { sameDay } from './chatTime';

/**
 * How a thread lays its messages out: which side each stands on, and whose name stands above it
 * where a side has more than one voice.
 */

export interface ThreadMessage {
	id: string;
	fromTeam: boolean;
	mine: boolean;
	authorName?: string | null;
	authorParticipantId?: string | null;
}

export interface ThreadChat {
	kind: ChatKind;
	inbox?: ChatInbox | null;
	committee?: { abbreviation: string } | null;
	participantId?: string | null;
	contacts: readonly (ContactLabelSource & { participantId: string })[];
}

/**
 * Whether a message stands on the caller's side of the thread (the right): the inbox's for the
 * team, their own for a participant. Reviewing, the chat's first participant is on the left, and
 * in a delegation's group, which has no sides, everybody is.
 */
export function standsOnOwnSide({
	message,
	side,
	chat
}: {
	message: ThreadMessage;
	side: ChatSide;
	chat: ThreadChat;
}) {
	if (side === 'TEAM') return message.fromTeam;
	if (side === 'PARTICIPANT') return message.mine;
	return chat.kind !== 'DELEGATION' && message.authorParticipantId !== chat.participantId;
}

/** The function a team member writes under: their inbox, a trusted person as just that. */
function authorInbox(chat: { inbox: ChatInbox; committee?: { abbreviation: string } | null }) {
	return chat.inbox === 'TRUSTED_PERSON'
		? m.chatInboxTrustedPerson()
		: inboxName({ inbox: chat.inbox, committeeAbbreviation: chat.committee?.abbreviation });
}

/**
 * Who wrote a message, where the thread has more than one voice per side: the inbox and the name
 * of a team member; in a delegation group and for participant care the role and the name.
 * Undefined in a direct chat, whose two parties know who the other is.
 */
export function messageAuthor({
	message,
	side,
	chat
}: {
	message: ThreadMessage;
	side: ChatSide;
	chat: ThreadChat;
}) {
	if (message.fromTeam) {
		const inbox = chat.inbox ? authorInbox({ ...chat, inbox: chat.inbox }) : m.team();
		return [inbox, message.authorName].filter(Boolean).join(' · ');
	}
	if (chat.kind !== 'DELEGATION' && side !== 'REVIEW') return undefined;
	const contact = chat.contacts.find(
		(candidate) => candidate.participantId === message.authorParticipantId
	);
	const parts = [contact ? contactLabel(contact) : undefined, message.authorName];
	return parts.filter(Boolean).join(' · ') || undefined;
}

export interface Bubble<M extends ThreadMessage> {
	message: M;
	own: boolean;
	/** The line above the bubble; undefined where none is shown */
	author: string | undefined;
	/** Follows a message of the same author on the same side, so it sits closer and repeats no name */
	continues: boolean;
}

/** The messages of one day as bubbles, in their order. */
export function bubblesOf<M extends ThreadMessage>({
	messages,
	side,
	chat
}: {
	messages: readonly M[];
	side: ChatSide;
	chat: ThreadChat;
}): Bubble<M>[] {
	let previous: { own: boolean; author: string | undefined } | undefined;
	return messages.map((message) => {
		const own = standsOnOwnSide({ message, side, chat });
		const author = messageAuthor({ message, side, chat });
		const continues = previous !== undefined && previous.own === own && previous.author === author;
		previous = { own, author };
		// a participant needs no name above their own messages
		const shown = continues || (own && side === 'PARTICIPANT') ? undefined : author;
		return { message, own, author: shown, continues };
	});
}

/** Messages of one author written closer together than this share a bubble */
const RUN_GAP_MS = 5 * 60 * 1000;

export interface BubbleRun<M extends ThreadMessage> {
	/** The first message's id, which a line above the run is keyed to */
	key: string;
	own: boolean;
	author: string | undefined;
	/** Follows a run of the same author, so it sits closer */
	continues: boolean;
	messages: M[];
}

/**
 * Bubbles merged the way messengers do: what one author writes in a row within a few minutes
 * shares one bubble. A message a line stands above (`breaksBefore`: unread, reported) starts a
 * run of its own, so the line can stand between them.
 */
export function runsOf<M extends ThreadMessage & { createdAt: Date | string }>({
	bubbles,
	breaksBefore
}: {
	bubbles: readonly Bubble<M>[];
	breaksBefore: readonly (string | undefined)[];
}): BubbleRun<M>[] {
	const runs: BubbleRun<M>[] = [];
	for (const { message, own, author, continues } of bubbles) {
		const run = runs.at(-1);
		const previous = run?.messages.at(-1);
		const joins =
			run &&
			previous &&
			continues &&
			!breaksBefore.includes(message.id) &&
			new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() <= RUN_GAP_MS;
		if (joins) run.messages.push(message);
		else runs.push({ key: message.id, own, author, continues, messages: [message] });
	}
	return runs;
}

/**
 * What there is to mark as read in an open chat, as a key that changes with each new message, or
 * nothing: no chat, a chat only reviewed (which never counts as read), or nothing unread.
 */
export function unreadStateOf({
	chat,
	side,
	newestId
}: {
	chat: { id: string; unreadCount: number } | null;
	side: ChatSide;
	newestId: string;
}) {
	if (!chat || side === 'REVIEW' || chat.unreadCount === 0) return null;
	return `${chat.id}:${newestId}`;
}

/**
 * The message the reader left off before: the oldest of the `unreadCount` latest messages that
 * stand on the other side, which a line marks when the chat is opened. Undefined when nothing is
 * unread or while only reviewing; the oldest loaded message when more are unread than loaded.
 */
export function firstUnreadId({
	messages,
	side,
	chat,
	unreadCount
}: {
	messages: readonly ThreadMessage[];
	side: ChatSide;
	chat: ThreadChat;
	unreadCount: number;
}) {
	if (side === 'REVIEW' || unreadCount <= 0) return undefined;
	const others = messages.filter((message) => !standsOnOwnSide({ message, side, chat }));
	return others.at(-unreadCount)?.id ?? others.at(0)?.id;
}

/** A report of a chat as participant care reads it in the thread */
export interface ThreadReport {
	id: string;
	reason: string;
	createdAt: Date | string;
	reporterName?: string | null;
}

export interface PlacedReports<R> {
	/**
	 * Reports placed above a message, the first written after them: `inDay` below the heading of
	 * the message's day, `beforeDay` above it when they were filed on an earlier day
	 */
	above: Map<string, { beforeDay: R[]; inDay: R[] }>;
	/** Filed after the last message: they close the thread */
	after: R[];
}

/**
 * Where reports fall into a thread: each stands at the moment it was filed, before the first
 * message written after it.
 */
export function placeReports<R extends { createdAt: Date | string }>({
	messages,
	reports
}: {
	messages: readonly { id: string; createdAt: Date | string }[];
	reports: readonly R[];
}): PlacedReports<R> {
	const placed: PlacedReports<R> = { above: new Map(), after: [] };
	for (const report of reports) {
		const filed = new Date(report.createdAt);
		const next = messages.find((message) => new Date(message.createdAt) > filed);
		if (!next) {
			placed.after.push(report);
			continue;
		}
		const slot = placed.above.get(next.id) ?? { beforeDay: [], inDay: [] };
		(sameDay(filed, new Date(next.createdAt)) ? slot.inDay : slot.beforeDay).push(report);
		placed.above.set(next.id, slot);
	}
	return placed;
}

/**
 * What the thread does as its newest message changes (`key` names chat and message): it opens at
 * the first unread message, and later follows down to a new one while the reader is near the end
 * or wrote it themselves. Otherwise it flags the message as missed.
 */
export function followStep({
	key,
	seenKey,
	nearEnd,
	newest,
	side,
	chat
}: {
	key: string;
	/** The key handled last, empty before the thread opened */
	seenKey: string;
	nearEnd: boolean;
	newest: ThreadMessage | undefined;
	side: ChatSide;
	chat: ThreadChat | null;
}): 'stay' | 'open' | 'follow' | 'flag' {
	if (key === seenKey) return 'stay';
	if (seenKey === '') return 'open';
	if (nearEnd) return 'follow';
	const own = !!newest && !!chat && standsOnOwnSide({ message: newest, side, chat });
	return own ? 'follow' : 'flag';
}

/** Opening jumps; following glides, unless the reader asked for less motion. */
export function scrollBehaviorFor({
	opening,
	reducedMotion
}: {
	opening: boolean;
	reducedMotion: boolean;
}): ScrollBehavior {
	return opening || reducedMotion ? 'instant' : 'smooth';
}
