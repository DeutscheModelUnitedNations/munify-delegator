/**
 * The rules of the chats that the API and the pages share: which team inbox reaches whom, and why
 * someone cannot write into a chat right now.
 */

export type ChatKind = 'DIRECT' | 'DELEGATION' | 'TEAM';
export type ChatInbox = 'PARTICIPANT_CARE' | 'CHAIR' | 'CONSULTANT' | 'TRUSTED_PERSON';
/** How the caller relates to a chat: a party, somebody answering its inbox, or participant care reviewing a report. */
export type ChatSide = 'PARTICIPANT' | 'TEAM' | 'REVIEW';

export const CHAT_MESSAGE_MAX_LENGTH = 4000;
export const CHAT_REPORT_REASON_MAX_LENGTH = 1000;
/** How long a message stays unread before a mail tells its reader. */
export const UNREAD_MESSAGE_MAIL_MINUTES = 15;

/**
 * Whether a team inbox and a person write each other. Participant care and the trusted persons
 * reach everybody with a registration. A committee's chairs and consultants reach the people seated in their committee,
 * and those seated without one (non-state actors, single participants), who move between all.
 */
export function inboxReaches({
	inbox,
	committeeId,
	person
}: {
	inbox: ChatInbox;
	committeeId: string | null;
	/** The person's seat; null while they hold none (or it is not released to them yet). */
	person: { committeeId: string | null } | null;
}) {
	if (inbox === 'PARTICIPANT_CARE' || inbox === 'TRUSTED_PERSON') return true;
	if (!person || !committeeId) return false;
	return person.committeeId === null || person.committeeId === committeeId;
}

/** A trusted person is one for the whole conference; chairs and consultants are a committee's. */
export function functionFitsCommittee({
	kind,
	committeeId
}: {
	kind: 'CHAIR' | 'CONSULTANT' | 'TRUSTED_PERSON';
	committeeId: string | null;
}) {
	return (kind === 'TRUSTED_PERSON') === (committeeId === null);
}

export type WriteRefusal =
	'DISABLED' | 'NOT_RELEASED' | 'NOT_SEATED' | 'SUSPENDED' | 'BLOCKED' | 'REVIEW';

/**
 * Why the caller cannot write into a chat, or null when they can. The team answers its inboxes
 * whenever messaging is on; participants write each other and their delegation once the roles are
 * released, while both hold a seat, neither blocked the other and the writer is not suspended.
 */
export function writeRefusal({
	kind,
	side,
	messagingEnabled,
	assignmentReleased,
	writerSeated,
	writerSuspended,
	counterpartSeated,
	blocked
}: {
	kind: ChatKind;
	side: ChatSide;
	messagingEnabled: boolean;
	assignmentReleased: boolean;
	writerSeated: boolean;
	writerSuspended: boolean;
	/** `DIRECT`: whether the other party still holds a seat. */
	counterpartSeated: boolean;
	/** `DIRECT`: either party blocked the other. */
	blocked: boolean;
}): WriteRefusal | null {
	if (side === 'REVIEW') return 'REVIEW';
	if (!messagingEnabled) return 'DISABLED';
	if (side === 'TEAM' || kind === 'TEAM') return null;
	if (!assignmentReleased) return 'NOT_RELEASED';
	if (!writerSeated) return 'NOT_SEATED';
	if (writerSuspended) return 'SUSPENDED';
	if (kind === 'DIRECT' && !counterpartSeated) return 'NOT_SEATED';
	if (kind === 'DIRECT' && blocked) return 'BLOCKED';
	return null;
}

/** The first line of a message, cut for a chat list. */
export function messagePreview(body: string, length = 90) {
	const line = body.replace(/\s+/g, ' ').trim();
	return line.length > length ? `${line.slice(0, length - 1).trimEnd()}…` : line;
}
