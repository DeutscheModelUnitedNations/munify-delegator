/**
 * What a team member is told about, and how: the rules the notification settings page, the mails
 * (`#api/handlers/email/unreadMessages`) and the Slack messages (`#api/handlers/notification/`)
 * share, so the page lists exactly what is sent.
 */
import { PAPER_ROLES, PARTICIPANT_CARE_ROLES } from '#lib/helpers/teamRoles';
import type { ChatInbox } from '#lib/helpers/chat';

export type NotificationChannel = 'EMAIL' | 'SLACK';

export type NotificationTopic =
	| 'PARTICIPANT_CARE'
	| 'COMMITTEE_INBOX'
	| 'TRUSTED_SHARED'
	| 'TRUSTED_PERSONAL'
	| 'CHAT_REPORT'
	| 'COMMITTEE_PAPERS'
	| 'SCAN_PROBLEM';

/**
 * One line of the settings: a topic, and for a committee's inbox or papers the member's function
 * there.
 */
export interface TopicKey {
	topic: NotificationTopic;
	teamFunctionId: string | null;
}

/** A team member as far as the notifications ask: their role and functions. */
export interface NotifiedMember {
	userId: string;
	role: string;
	functions: readonly { id: string; committeeId: string | null; kind: string }[];
}

const careRoles: readonly string[] = PARTICIPANT_CARE_ROLES;
const paperRoles: readonly string[] = PAPER_ROLES;

/** A chair's or consultant's function, which answers its committee's inbox. */
const isCommitteeFunction = (held: NotifiedMember['functions'][number]) =>
	(held.kind === 'CHAIR' || held.kind === 'CONSULTANT') && held.committeeId !== null;

/** The topics a member can be told about, in the order the page lists them. */
export function topicsOf(member: NotifiedMember): TopicKey[] {
	const topics: TopicKey[] = [];
	const care = careRoles.includes(member.role);
	if (care) topics.push({ topic: 'PARTICIPANT_CARE', teamFunctionId: null });
	const committeeFunctions = member.functions.filter(isCommitteeFunction);
	for (const held of committeeFunctions) {
		topics.push({ topic: 'COMMITTEE_INBOX', teamFunctionId: held.id });
	}
	if (paperRoles.includes(member.role)) {
		for (const held of committeeFunctions) {
			topics.push({ topic: 'COMMITTEE_PAPERS', teamFunctionId: held.id });
		}
	}
	if (member.functions.some((held) => held.kind === 'TRUSTED_PERSON')) {
		topics.push({ topic: 'TRUSTED_SHARED', teamFunctionId: null });
		topics.push({ topic: 'TRUSTED_PERSONAL', teamFunctionId: null });
	}
	if (care) {
		topics.push({ topic: 'CHAT_REPORT', teamFunctionId: null });
		topics.push({ topic: 'SCAN_PROBLEM', teamFunctionId: null });
	}
	return topics;
}

/** The inbox a message waits in, as the notifications tell it apart. */
export interface NotifiedInbox {
	inbox: ChatInbox;
	committeeId: string | null;
	/** A chat with one trusted person: only theirs to read */
	trustedUserId: string | null;
}

/**
 * The topic under which `member` hears of a message waiting in `inbox`, or null when they do not
 * answer it: participant care by role, a committee's inbox by the function they hold there, the
 * trusted persons their shared chat and each the chats written to them alone.
 */
export function topicOfInbox({
	member,
	inbox
}: {
	member: NotifiedMember;
	inbox: NotifiedInbox;
}): TopicKey | null {
	if (inbox.inbox === 'PARTICIPANT_CARE') {
		return careRoles.includes(member.role)
			? { topic: 'PARTICIPANT_CARE', teamFunctionId: null }
			: null;
	}
	if (inbox.inbox === 'TRUSTED_PERSON') {
		if (!member.functions.some((held) => held.kind === 'TRUSTED_PERSON')) return null;
		if (inbox.trustedUserId === null) return { topic: 'TRUSTED_SHARED', teamFunctionId: null };
		return inbox.trustedUserId === member.userId
			? { topic: 'TRUSTED_PERSONAL', teamFunctionId: null }
			: null;
	}
	const held = member.functions.find(
		(fn) => fn.kind === inbox.inbox && fn.committeeId === inbox.committeeId
	);
	return held ? { topic: 'COMMITTEE_INBOX', teamFunctionId: held.id } : null;
}

/**
 * The topics under which `member` hears of a paper submitted in `committeeId`: one per chair or
 * consultant function they hold there, and only while their team role may read the papers (the
 * paper team, `PAPER_ROLES`). Empty for everybody else. Somebody holding both functions there is
 * told once, when either of the two wants it.
 */
export function paperTopicsOf({
	member,
	committeeId
}: {
	member: NotifiedMember;
	committeeId: string;
}): TopicKey[] {
	if (!paperRoles.includes(member.role)) return [];
	return member.functions
		.filter((held) => isCommitteeFunction(held) && held.committeeId === committeeId)
		.map((held) => ({ topic: 'COMMITTEE_PAPERS', teamFunctionId: held.id }));
}

/** Whether `member` hears of new reports: participant care does. */
export const hearsOfReports = (member: Pick<NotifiedMember, 'role'>) =>
	careRoles.includes(member.role);

/**
 * Whether `member` wants to hear on `channel` of a paper submitted in `committeeId`: one of
 * `paperTopicsOf` wants it. A member holding two functions there is told once either way.
 */
export function wantsPaperNotification({
	member,
	committeeId,
	preferences,
	channel,
	mailByDefault
}: {
	member: NotifiedMember;
	committeeId: string;
	preferences: readonly StoredPreference[];
	channel: NotificationChannel;
	mailByDefault: boolean;
}): boolean {
	return paperTopicsOf({ member, committeeId }).some((key) =>
		wantsNotification({ preferences, key, channel, mailByDefault })
	);
}

/** One stored choice (`notificationPreference`). */
export interface StoredPreference extends TopicKey {
	channel: NotificationChannel;
	enabled: boolean;
}

/**
 * Whether a member wants to hear of `key` on `channel`: their stored choice, else the default.
 * Every channel is on by default; mail starts off for someone who switched the unread-messages
 * mails off before there were settings per topic (`user.messageNotificationEmails`).
 */
export function wantsNotification({
	preferences,
	key,
	channel,
	mailByDefault
}: {
	preferences: readonly StoredPreference[];
	key: TopicKey;
	channel: NotificationChannel;
	mailByDefault: boolean;
}): boolean {
	const stored = preferences.find(
		(preference) =>
			preference.channel === channel &&
			preference.topic === key.topic &&
			preference.teamFunctionId === key.teamFunctionId
	);
	if (stored) return stored.enabled;
	return channel === 'EMAIL' ? mailByDefault : true;
}

/** An inbox as one string: the Slack messages tell of each inbox once until it is read. */
export const inboxKey = ({ inbox, committeeId, trustedUserId }: NotifiedInbox) =>
	`${inbox}:${committeeId ?? ''}:${trustedUserId ?? ''}`;
