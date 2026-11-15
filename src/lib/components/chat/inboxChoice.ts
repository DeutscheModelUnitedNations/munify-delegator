import { conflictMessageOf } from '#lib/api/errorCodes';
import { m } from '#lib/paraglide/messages';

/** What to do with the inboxes that reach a person: nothing to write from, one, or a choice. */
export type InboxChoice<T> =
	{ kind: 'none' } | { kind: 'one'; option: T } | { kind: 'several'; options: T[] };

/** With one inbox the chat opens right away, with several the caller picks which to write from. */
export function inboxChoice<T>(reaching: readonly T[]): InboxChoice<T> {
	const [only] = reaching;
	if (only === undefined) return { kind: 'none' };
	if (reaching.length === 1) return { kind: 'one', option: only };
	return { kind: 'several', options: [...reaching] };
}

/** Why a chat could not be opened: the API's own reason for a conflict, a general one otherwise. */
export const chatOpenError = (error: unknown) =>
	conflictMessageOf(error) ?? m.chatCouldNotBeOpened();

/** Why a message could not be sent, likewise. */
export const chatSendError = (error: unknown) => conflictMessageOf(error) ?? m.chatSendFailed();
