import type { ChatKind, ChatSide } from '#lib/helpers/chat';

/**
 * Messages participant care hid for everybody of a reported chat. The parties get them without
 * their text (`body` is null), participant care and system admins with it, marked as hidden.
 */

/** What to hide: one message, or everything a person wrote into the chat so far. */
export type HideTarget =
	| { kind: 'message'; messageId: string }
	| { kind: 'person'; chatId: string; participantId: string; name: string };

/**
 * How a message shows: as written (`visible`), as a placeholder for a party who no longer reads
 * its text (`placeholder`), or with its text marked as hidden for the reviewer (`evidence`).
 */
export function hiddenState(message: {
	body: string | null;
	hiddenAt?: Date | string | null;
}): 'visible' | 'placeholder' | 'evidence' {
	if (!message.hiddenAt) return 'visible';
	return message.body === null ? 'placeholder' : 'evidence';
}

/**
 * Whether the reader may hide messages of the chat: participant care reviewing a reported chat
 * between participants. A team chat is its inbox's.
 */
export function canHideIn({ side, kind }: { side: ChatSide; kind: ChatKind }) {
	return side === 'REVIEW' && kind !== 'TEAM';
}
