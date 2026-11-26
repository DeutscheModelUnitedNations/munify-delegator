/**
 * The rules of the chats that the API and the pages share: which team inbox reaches whom, and why
 * someone cannot write into a chat right now.
 */

export type ChatKind = 'DIRECT' | 'DELEGATION' | 'TEAM' | 'COMMITTEE' | 'ROLE';
export type ChatInbox =
	'PARTICIPANT_CARE' | 'CHAIR' | 'CONSULTANT' | 'TRUSTED_PERSON' | 'ROLE_SUPPORT';
export type TeamFunctionKind = 'CHAIR' | 'CONSULTANT' | 'TRUSTED_PERSON' | 'ROLE_SUPPORT';

/** The groups of a committee or a custom role, which everybody seated there shares with its team. */
export const isGroupChat = (kind: ChatKind): kind is 'COMMITTEE' | 'ROLE' =>
	kind === 'COMMITTEE' || kind === 'ROLE';
/** How the caller relates to a chat: a party, somebody answering its inbox, or participant care reviewing a report. */
export type ChatSide = 'PARTICIPANT' | 'TEAM' | 'REVIEW';

export const CHAT_MESSAGE_MAX_LENGTH = 4000;
/** How long the note participant care leaves when settling a report may be. */
export const CHAT_REPORT_NOTE_MAX_LENGTH = 2000;
export const CHAT_REPORT_REASON_MAX_LENGTH = 1000;
/** How long the reason participant care gives for hiding a message may be. */
export const CHAT_HIDE_REASON_MAX_LENGTH = 1000;
/** How long a message stays unread before a mail tells its reader. */
export const UNREAD_MESSAGE_MAIL_MINUTES = 15;

/**
 * Whether a team inbox and a person write each other. Participant care and the trusted persons
 * reach everybody with a registration. A committee's chairs and consultants reach the people seated in their committee,
 * and those seated without one (non-state actors, single participants), who move between all. The
 * team members looking after a custom role reach the people holding it.
 */
export function inboxReaches({
	inbox,
	committeeId,
	roleId = null,
	person
}: {
	inbox: ChatInbox;
	committeeId: string | null;
	/** The custom role of a `ROLE_SUPPORT` inbox. */
	roleId?: string | null;
	/** The person's seat; null while they hold none (or it is not released to them yet). */
	person: { committeeId: string | null; roleId?: string | null } | null;
}) {
	if (inbox === 'PARTICIPANT_CARE' || inbox === 'TRUSTED_PERSON') return true;
	if (inbox === 'ROLE_SUPPORT') return !!person && roleId !== null && person.roleId === roleId;
	if (!person || !committeeId) return false;
	return person.committeeId === null || person.committeeId === committeeId;
}

/**
 * A trusted person is one for the whole conference, chairs and consultants are a committee's, and
 * whoever looks after a custom role (`ROLE_SUPPORT`) is that role's.
 */
export function functionFits({
	kind,
	committeeId,
	roleId = null
}: {
	kind: TeamFunctionKind;
	committeeId: string | null;
	roleId?: string | null;
}) {
	if (kind === 'ROLE_SUPPORT') return roleId !== null && committeeId === null;
	if (roleId !== null) return false;
	return (kind === 'TRUSTED_PERSON') === (committeeId === null);
}

export type WriteRefusal =
	| 'DISABLED'
	| 'GROUPS_DISABLED'
	| 'NOT_RELEASED'
	| 'NOT_SEATED'
	| 'SUSPENDED'
	| 'BLOCKED'
	| 'REVIEW';

/**
 * Why the caller cannot write into a chat, or null when they can. Chats with the team are always
 * open, from the registration on. A delegation's group is open to its members from the moment the
 * delegation exists, and closes for a delegation the released assignment gave no role.
 * Participants of different delegations write each other only while the conference switched
 * messaging on (`messagingEnabled`), once the roles are released, while both hold a seat and
 * neither blocked the other. A suspended participant writes only to the team. The groups of a
 * committee or custom role are open to the people seated there while the conference switched them
 * on (`groupChatsEnabled`) and their seat is released; the team in them writes any time.
 */
export function writeRefusal({
	kind,
	side,
	messagingEnabled,
	groupChatsEnabled = false,
	assignmentReleased,
	writerSeated,
	writerSuspended,
	counterpartSeated,
	blocked
}: {
	kind: ChatKind;
	side: ChatSide;
	/** The conference's switch: chats between participants of different delegations. */
	messagingEnabled: boolean;
	/** The conference's switch: the groups of committees and custom roles. */
	groupChatsEnabled?: boolean;
	assignmentReleased: boolean;
	writerSeated: boolean;
	writerSuspended: boolean;
	/** `DIRECT`: whether the other party still holds a seat. */
	counterpartSeated: boolean;
	/** `DIRECT`: either party blocked the other. */
	blocked: boolean;
}): WriteRefusal | null {
	if (side === 'REVIEW') return 'REVIEW';
	if (side === 'TEAM' || kind === 'TEAM') return null;
	if (kind === 'DELEGATION') {
		return delegationRefusal({ assignmentReleased, writerSeated, writerSuspended });
	}
	if (isGroupChat(kind)) {
		return groupRefusal({ groupChatsEnabled, assignmentReleased, writerSeated, writerSuspended });
	}
	if (!messagingEnabled) return 'DISABLED';
	if (!assignmentReleased) return 'NOT_RELEASED';
	if (!writerSeated) return 'NOT_SEATED';
	if (writerSuspended) return 'SUSPENDED';
	if (!counterpartSeated) return 'NOT_SEATED';
	if (blocked) return 'BLOCKED';
	return null;
}

/** `writeRefusal` for a member in their delegation's group. */
function delegationRefusal({
	assignmentReleased,
	writerSeated,
	writerSuspended
}: {
	assignmentReleased: boolean;
	writerSeated: boolean;
	writerSuspended: boolean;
}): WriteRefusal | null {
	// before the release nobody holds a seat; after it a rejected delegation's group closes
	if (assignmentReleased && !writerSeated) return 'NOT_SEATED';
	return writerSuspended ? 'SUSPENDED' : null;
}

/** `writeRefusal` for a participant in the group of a committee or custom role. */
function groupRefusal({
	groupChatsEnabled,
	assignmentReleased,
	writerSeated,
	writerSuspended
}: {
	groupChatsEnabled: boolean;
	assignmentReleased: boolean;
	writerSeated: boolean;
	writerSuspended: boolean;
}): WriteRefusal | null {
	if (!groupChatsEnabled) return 'GROUPS_DISABLED';
	if (!assignmentReleased) return 'NOT_RELEASED';
	if (!writerSeated) return 'NOT_SEATED';
	return writerSuspended ? 'SUSPENDED' : null;
}

/** The first line of a message, cut for a chat list. */
export function messagePreview(body: string, length = 90) {
	const line = body.replace(/\s+/g, ' ').trim();
	return line.length > length ? `${line.slice(0, length - 1).trimEnd()}…` : line;
}
