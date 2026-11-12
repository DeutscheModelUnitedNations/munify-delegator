import { m } from '#lib/paraglide/messages';
import type { ChatInbox, ChatKind, ChatSide } from '#lib/helpers/chat';
import { contactLabel, inboxName, type ContactLabelSource } from './chatLabels';

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
 * team, their own for a participant. Reviewing, the chat's first participant is on the left.
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
	return message.authorParticipantId !== chat.participantId;
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
		const inbox = chat.inbox
			? inboxName({ inbox: chat.inbox, committeeAbbreviation: chat.committee?.abbreviation })
			: m.team();
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
