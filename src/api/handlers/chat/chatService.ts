/**
 * The chats' business logic: finding or opening a chat, writing into it, reading, blocking,
 * reporting. Who may do any of it is `chatPermissions.ts`'s: everything here takes the caller's
 * side, participant row or user id as the permissions file settled them.
 */
import { and, count, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '#api/db/db';
import {
	chatMessagePubsub,
	chatPubsub,
	chatReportPubsub,
	conferenceParticipantPubsub,
	userPubsub
} from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { createBatcher } from '#api/services/batcher';
import { m } from '#lib/paraglide/messages';
import {
	CHAT_MESSAGE_MAX_LENGTH,
	CHAT_REPORT_REASON_MAX_LENGTH,
	inboxReaches,
	isGroupChat,
	writeRefusal,
	type ChatInbox,
	type ChatSide,
	type WriteRefusal
} from '#lib/helpers/chat';
import { refusalText } from '#lib/helpers/chatRefusalText';
import { conferenceContacts, forgetContacts, type Contact } from './chatContacts';
import {
	tellGroupOnSlack,
	tellInboxOnSlack,
	tellReportOnSlack
} from '#api/handlers/notification/slackNotifications';

export type ChatRow = typeof schema.chat.$inferSelect;

export const messageBodySchema = z
	.string()
	.trim()
	.min(1, { error: () => m.chatMessageEmpty() })
	.max(CHAT_MESSAGE_MAX_LENGTH, {
		error: () => m.chatMessageTooLong({ max: CHAT_MESSAGE_MAX_LENGTH })
	});

export const reportReasonSchema = z
	.string()
	.trim()
	.min(1, { error: () => m.chatReportReasonMissing() })
	.max(CHAT_REPORT_REASON_MAX_LENGTH, {
		error: () => m.chatReportReasonTooLong({ max: CHAT_REPORT_REASON_MAX_LENGTH })
	});

/** `openGroupChat`'s arguments: a committee or a custom role, exactly one of them. */
export const groupArgsSchema = z
	.looseObject({ committeeId: z.string().nullish(), roleId: z.string().nullish() })
	.refine((args) => !args.committeeId !== !args.roleId, { error: () => m.chatGroupArgs() });

function refused(reason: WriteRefusal) {
	return apiError({ code: 'CONFLICT', message: refusalText(reason) });
}

async function messagingFlags(conferenceId: string) {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { messagingEnabled: true, assignmentReleased: true, groupChatsEnabled: true }
	});
	if (!conference) throw apiError({ code: 'NOT_FOUND', message: m.conferenceNotFound() });
	return conference;
}

/**
 * Whether a seated person is in the group of a committee or custom role: seated in the committee,
 * or holding the role.
 */
export function seatedInGroup({
	contact,
	chat
}: {
	contact: Pick<Contact, 'committee' | 'role'>;
	chat: Pick<ChatRow, 'kind' | 'committeeId' | 'roleId'>;
}) {
	if (chat.kind === 'COMMITTEE') {
		return chat.committeeId !== null && contact.committee?.id === chat.committeeId;
	}
	if (chat.kind === 'ROLE') return chat.roleId !== null && contact.role.id === chat.roleId;
	return false;
}

/** Whether either party of a direct chat blocked the other. */
async function isBlocked({ a, b }: { a: string; b: string }) {
	const block = await db.query.chatBlock.findFirst({
		where: {
			OR: [
				{ blockerParticipantId: a, blockedParticipantId: b },
				{ blockerParticipantId: b, blockedParticipantId: a }
			]
		},
		columns: { id: true }
	});
	return block !== undefined;
}

/**
 * Why `writerParticipantId` (null for the team) cannot write into the chat right now, or null
 * when they can (`writeRefusal`).
 */
export async function chatWriteRefusal({
	chat,
	side,
	writerParticipantId
}: {
	chat: ChatRow;
	side: ChatSide;
	writerParticipantId: string | null;
}) {
	const [flags, contacts] = await Promise.all([
		messagingFlags(chat.conferenceId),
		conferenceContacts(chat.conferenceId)
	]);
	const writer = writerParticipantId ? contacts.get(writerParticipantId) : undefined;
	// in a group the writer's seat is the group's: a delegate moved to another committee is out
	const seated =
		writer !== undefined && (!isGroupChat(chat.kind) || seatedInGroup({ contact: writer, chat }));
	const counterpartId =
		chat.participantId === writerParticipantId ? chat.otherParticipantId : chat.participantId;
	const direct = chat.kind === 'DIRECT' && writerParticipantId && counterpartId;
	return writeRefusal({
		kind: chat.kind,
		side,
		...flags,
		writerSeated: seated,
		writerSuspended: writer?.suspended ?? false,
		counterpartSeated: counterpartId ? contacts.has(counterpartId) : false,
		blocked: direct ? await isBlocked({ a: writerParticipantId, b: counterpartId }) : false
	});
}

/**
 * A team inbox, with the committee of a chairs' or consultants' one, the custom role of a
 * `ROLE_SUPPORT` one, or the one trusted person it is (`id` is their function's, which names them
 * without their account).
 */
export interface InboxOption {
	inbox: ChatInbox;
	committee: { id: string; abbreviation: string; name: string } | null;
	role?: { id: string; name: string | null; icon: string | null } | null;
	person: { id: string; userId: string; name: string } | null;
}

const byText = (a: string | undefined, b: string | undefined) => (a ?? '').localeCompare(b ?? '');

/**
 * The team inboxes of the conference that somebody answers: participant care, the trusted persons
 * together and each of them alone, each committee function a team member holds, and each custom
 * role somebody looks after.
 */
async function conferenceInboxes(conferenceId: string): Promise<InboxOption[]> {
	const functions = await db.query.teamFunction.findMany({
		where: { teamMember: { conferenceId } },
		columns: { id: true, kind: true },
		with: {
			committee: { columns: { id: true, abbreviation: true, name: true } },
			role: { columns: { id: true, name: true, icon: true } },
			teamMember: {
				columns: { userId: true },
				with: { user: { columns: { givenName: true, familyName: true } } }
			}
		}
	});
	const committeeInboxes = new Map<string, InboxOption>();
	const roleInboxes = new Map<string, InboxOption>();
	const trusted: InboxOption[] = [];
	for (const { id, kind, committee, role, teamMember } of functions) {
		if (committee) {
			committeeInboxes.set(`${committee.id}/${kind}`, { inbox: kind, committee, person: null });
		} else if (kind === 'ROLE_SUPPORT' && role) {
			roleInboxes.set(role.id, { inbox: kind, committee: null, role, person: null });
		} else if (kind === 'TRUSTED_PERSON' && teamMember.user) {
			const name = `${teamMember.user.givenName} ${teamMember.user.familyName}`;
			trusted.push({
				inbox: kind,
				committee: null,
				person: { id, userId: teamMember.userId, name }
			});
		}
	}
	return [
		{ inbox: 'PARTICIPANT_CARE', committee: null, person: null },
		// all trusted persons together first, then each of them
		...(trusted.length > 0
			? [{ inbox: 'TRUSTED_PERSON' as const, committee: null, person: null }]
			: []),
		...trusted.sort((a, b) => byText(a.person?.name, b.person?.name)),
		...[...committeeInboxes.values()].sort(
			(a, b) =>
				byText(a.committee?.abbreviation, b.committee?.abbreviation) ||
				a.inbox.localeCompare(b.inbox)
		),
		...[...roleInboxes.values()].sort((a, b) =>
			byText(a.role?.name ?? undefined, b.role?.name ?? undefined)
		)
	];
}

/**
 * The team inboxes that write with the participant (`inboxReaches`): participant care and the
 * trusted persons always, from the registration on and whatever the conference's switch says, a
 * committee's chairs and consultants once the participant's seat is released, and whoever looks
 * after a custom role once the participant's role is released.
 */
export async function inboxesReaching({
	conferenceId,
	participantId
}: {
	conferenceId: string;
	participantId: string;
}) {
	const [flags, contacts, inboxes] = await Promise.all([
		messagingFlags(conferenceId),
		conferenceContacts(conferenceId),
		conferenceInboxes(conferenceId)
	]);
	const contact = flags.assignmentReleased ? contacts.get(participantId) : undefined;
	const person = contact
		? { committeeId: contact.committee?.id ?? null, roleId: contact.role.id }
		: null;
	return inboxes.filter(({ inbox, committee, role }) =>
		inboxReaches({ inbox, committeeId: committee?.id ?? null, roleId: role?.id ?? null, person })
	);
}

/** The conference's flags, refused (CONFLICT) while it keeps participants from writing each other. */
async function assertDirectMessagingOn(conferenceId: string) {
	const flags = await messagingFlags(conferenceId);
	if (!flags.messagingEnabled) throw refused('DISABLED');
	return flags;
}

type ChatValues = typeof schema.chat.$inferInsert;
type ChatKey = NonNullable<Parameters<typeof db.query.chat.findFirst>[0]>['where'];

/** The chat `where` finds, created from `values` when there is none yet. */
async function findOrCreateChat({ where, values }: { where: ChatKey; values: ChatValues }) {
	const found = await db.query.chat.findFirst({ where });
	if (found) return found;
	// two people opening the same chat at once: the unique index lets one insert through
	const [created] = await db.insert(schema.chat).values(values).onConflictDoNothing().returning();
	if (created) {
		chatPubsub.created();
		return created;
	}
	const raced = await db.query.chat.findFirst({ where });
	if (!raced) throw apiError({ code: 'CONFLICT', message: m.chatCouldNotBeOpened() });
	return raced;
}

/** The direct chat of two seated participants, opened when they have none yet. */
export async function openDirectChat({
	conferenceId,
	fromParticipantId,
	toParticipantId
}: {
	conferenceId: string;
	fromParticipantId: string;
	toParticipantId: string;
}) {
	const flags = await assertDirectMessagingOn(conferenceId);
	if (!flags.assignmentReleased) throw refused('NOT_RELEASED');
	const contacts = await conferenceContacts(conferenceId);
	if (fromParticipantId === toParticipantId || !contacts.has(fromParticipantId)) {
		throw refused('NOT_SEATED');
	}
	if (!contacts.has(toParticipantId)) {
		throw apiError({ code: 'NOT_FOUND', message: m.chatContactNotFound() });
	}
	const [participantId, otherParticipantId] = [fromParticipantId, toParticipantId].sort();
	const key = { kind: 'DIRECT' as const, participantId, otherParticipantId };
	return findOrCreateChat({ where: key, values: { conferenceId, ...key } });
}

/**
 * The group chat of a delegation, opened when it has none yet: from the moment the delegation
 * exists, whatever the conference's switch says. Once the assignment is released a delegation
 * without a role keeps the group it had (read only, `writeRefusal`) but opens none.
 */
export async function openDelegationChat({
	conferenceId,
	delegationId
}: {
	conferenceId: string;
	delegationId: string;
}) {
	const key = { kind: 'DELEGATION' as const, delegationId };
	const existing = await db.query.chat.findFirst({ where: key });
	if (existing) return existing;
	const [flags, delegation] = await Promise.all([
		messagingFlags(conferenceId),
		db.query.delegation.findFirst({
			where: { id: delegationId, conferenceId },
			columns: { assignedRoleId: true }
		})
	]);
	if (!delegation || (flags.assignmentReleased && !delegation.assignedRoleId)) {
		throw refused('NOT_SEATED');
	}
	return findOrCreateChat({ where: key, values: { conferenceId, ...key } });
}

/**
 * The group of a committee or custom role, opened when it has none yet. Every committee and custom
 * role of the conference has one; who is in it is the permissions file's.
 */
export async function openGroupChat({
	conferenceId,
	group
}: {
	conferenceId: string;
	group: { committeeId: string } | { roleId: string };
}) {
	const key =
		'committeeId' in group
			? { kind: 'COMMITTEE' as const, committeeId: group.committeeId }
			: { kind: 'ROLE' as const, roleId: group.roleId };
	// that the committee or role is of the conference, and a custom role, is the database's
	return findOrCreateChat({ where: key, values: { conferenceId, ...key } });
}

/** The chat of a participant with a team inbox that reaches them, opened when there is none yet. */
export async function openTeamChat({
	conferenceId,
	participantId,
	inbox,
	committeeId,
	roleId = null,
	trustedUserId = null
}: {
	conferenceId: string;
	participantId: string;
	inbox: ChatInbox;
	committeeId: string | null;
	/** The custom role of a `ROLE_SUPPORT` inbox. */
	roleId?: string | null;
	/** The one trusted person to write to; null for their shared inbox and every other one */
	trustedUserId?: string | null;
}) {
	const reaching = await inboxesReaching({ conferenceId, participantId });
	const wanted = {
		inbox,
		committeeId: inbox === 'CHAIR' || inbox === 'CONSULTANT' ? committeeId : null,
		roleId: inbox === 'ROLE_SUPPORT' ? roleId : null,
		trustedUserId: inbox === 'TRUSTED_PERSON' ? trustedUserId : null
	};
	if (!reaching.some((option) => sameInbox({ option, wanted }))) {
		throw apiError({ code: 'CONFLICT', message: m.chatInboxNotAvailable() });
	}
	const orNone = (id: string | null) => id ?? { isNull: true as const };
	return findOrCreateChat({
		where: {
			kind: 'TEAM',
			participantId,
			inbox,
			committeeId: orNone(wanted.committeeId),
			roleId: orNone(wanted.roleId),
			// the trusted persons' shared chat is the one naming none of them
			trustedUserId: orNone(wanted.trustedUserId)
		},
		values: { conferenceId, kind: 'TEAM', participantId, ...wanted }
	});
}

/** Whether an inbox is the one a chat names: by its kind, its committee or role and its trusted person. */
export function sameInbox({
	option,
	wanted
}: {
	option: InboxOption;
	wanted: {
		inbox: ChatInbox | null;
		committeeId: string | null;
		roleId: string | null;
		trustedUserId: string | null;
	};
}) {
	return (
		option.inbox === wanted.inbox &&
		(option.committee?.id ?? null) === wanted.committeeId &&
		(option.role?.id ?? null) === wanted.roleId &&
		(option.person?.userId ?? null) === wanted.trustedUserId
	);
}

/**
 * The account behind a trusted person as `chatInboxes` names them (their function's id); CONFLICT
 * when nobody of the conference is that trusted person (any more).
 */
async function trustedUserIdOf({
	conferenceId,
	trustedPersonId
}: {
	conferenceId: string;
	trustedPersonId: string;
}) {
	const held = await db.query.teamFunction.findFirst({
		where: { id: trustedPersonId, kind: 'TRUSTED_PERSON', teamMember: { conferenceId } },
		columns: { id: true },
		with: { teamMember: { columns: { userId: true } } }
	});
	if (!held) throw apiError({ code: 'CONFLICT', message: m.chatInboxNotAvailable() });
	return held.teamMember.userId;
}

/** A team inbox of a conference as `openTeamChat` names it. */
export interface TeamChatTarget {
	conferenceId: string;
	inbox: ChatInbox;
	committeeId: string | null;
	roleId: string | null;
	trustedUserId: string | null;
}

/**
 * The inbox `openTeamChat`'s arguments name, with the one trusted person resolved to their
 * account (`trustedUserIdOf`).
 */
export async function teamChatTarget(args: {
	conferenceId: string;
	inbox: ChatInbox;
	committeeId?: string | null;
	roleId?: string | null;
	trustedPersonId?: string | null;
}): Promise<TeamChatTarget> {
	const { conferenceId, inbox, trustedPersonId } = args;
	return {
		conferenceId,
		inbox,
		committeeId: args.committeeId ?? null,
		roleId: args.roleId ?? null,
		trustedUserId: trustedPersonId ? await trustedUserIdOf({ conferenceId, trustedPersonId }) : null
	};
}

/** Who writes a message, by the caller's side of the chat: a party as themselves, else the team. */
export function messageAuthor({
	side,
	participantId,
	userId
}: {
	side: 'PARTICIPANT' | 'TEAM';
	participantId: string | null;
	userId: string;
}): MessageAuthor {
	return side === 'PARTICIPANT' && participantId
		? { side: 'PARTICIPANT', participantId, userId }
		: { side: 'TEAM', userId };
}

/** Who writes a message: a participant as their part in the conference, or a team member from the inbox. */
export type MessageAuthor =
	{ side: 'PARTICIPANT'; participantId: string; userId: string } | { side: 'TEAM'; userId: string };

/**
 * Writes a message into the chat, refused (CONFLICT) while the writer cannot write there
 * (`chatWriteRefusal`). A paper is only attached to a chat with its author.
 */
export async function sendMessage({
	chat,
	author,
	body,
	paperId,
	origin
}: {
	chat: ChatRow;
	author: MessageAuthor;
	body: string;
	paperId: string | null;
	/** The app's address, which the Slack message about it links to. */
	origin: string;
}) {
	const refusal = await chatWriteRefusal({
		chat,
		side: author.side,
		writerParticipantId: author.side === 'PARTICIPANT' ? author.participantId : null
	});
	if (refusal) throw refused(refusal);
	if (paperId) {
		const paper = await db.query.paper.findFirst({
			where: { id: paperId, authorParticipantId: chat.participantId ?? '' },
			columns: { id: true }
		});
		if (chat.kind !== 'TEAM' || !paper) {
			throw apiError({ code: 'INVALID_INPUT', message: m.chatPaperNotOfParticipant() });
		}
	}

	const now = new Date();
	const fromTeam = author.side === 'TEAM';
	// in a group everybody reads for themselves, the team included
	const group = isGroupChat(chat.kind);
	const id = await db.transaction(async (tx) => {
		const [message] = await tx
			.insert(schema.chatMessage)
			.values({
				chatId: chat.id,
				createdAt: now,
				body,
				paperId,
				fromTeam,
				authorParticipantId: author.side === 'PARTICIPANT' ? author.participantId : null,
				teamAuthorUserId: fromTeam ? author.userId : null
			})
			.returning({ id: schema.chatMessage.id });
		await tx
			.update(schema.chat)
			.set(chatAfterMessage({ kind: chat.kind, fromTeam, now }))
			.where(eq(schema.chat.id, chat.id));
		// whoever writes has read the chat; the inbox's reading is `teamReadAt`
		if (!fromTeam || group) {
			await writeRead({ tx, chatId: chat.id, userId: author.userId, readAt: now });
		}
		if (!message) throw new Error('sendMessage: the insert returned no row');
		return message.id;
	});
	chatMessagePubsub.created();
	chatPubsub.updated(chat.id);
	// the lists show chats that hold a message: with its first one a chat comes into them, which
	// a list only hears of as a new row
	if (!chat.lastMessageAt) chatPubsub.created();
	// whoever answers the inbox hears of it on Slack right away; the mail waits for the sweep
	if (!fromTeam) tellInboxOnSlack({ chat, messageId: id, origin });
	// the team of a group hears of what participants write there
	if (!fromTeam && group) tellGroupOnSlack({ chat, messageId: id, origin });
	return id;
}

/** What a new message changes of its chat. */
function chatAfterMessage({
	kind,
	fromTeam,
	now
}: {
	kind: ChatRow['kind'];
	fromTeam: boolean;
	now: Date;
}): Partial<ChatValues> {
	return {
		lastMessageAt: now,
		// a new message brings an archived chat back into its inbox
		teamArchivedAt: null,
		// an answer from the inbox means the inbox has read what came before (a group is read by
		// each of its people)
		...(fromTeam && !isGroupChat(kind) ? { teamReadAt: now } : {}),
		...(kind === 'TEAM' && !fromTeam ? { lastParticipantMessageAt: now } : {})
	};
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function writeRead({
	tx,
	chatId,
	userId,
	readAt
}: {
	tx: Tx | typeof db;
	chatId: string;
	userId: string;
	readAt: Date;
}) {
	return tx
		.insert(schema.chatRead)
		.values({ chatId, userId, readAt })
		.onConflictDoUpdate({
			target: [schema.chatRead.chatId, schema.chatRead.userId],
			set: { readAt, updatedAt: readAt }
		});
}

/** Marks the chat as read up to now: by the person, or by the inbox for everybody holding it. */
export async function markChatRead({
	chat,
	side,
	userId
}: {
	chat: ChatRow;
	side: 'PARTICIPANT' | 'TEAM';
	userId: string;
}) {
	const now = new Date();
	// a group is read by each of its people, the team's included
	if (side === 'TEAM' && !isGroupChat(chat.kind)) {
		await db.update(schema.chat).set({ teamReadAt: now }).where(eq(schema.chat.id, chat.id));
	} else {
		await writeRead({ tx: db, chatId: chat.id, userId, readAt: now });
	}
	chatPubsub.updated(chat.id);
}

/**
 * Puts a team chat away into its inbox's archive, for everybody holding the inbox, or takes it
 * out again. Putting it away reads it. The next message brings it back (`sendMessage`).
 */
export async function setChatArchived({ chat, archived }: { chat: ChatRow; archived: boolean }) {
	if (chat.kind !== 'TEAM') {
		throw apiError({ code: 'INVALID_INPUT', message: m.chatOnlyTeamCanBeArchived() });
	}
	const now = new Date();
	await db
		.update(schema.chat)
		.set(archived ? { teamArchivedAt: now, teamReadAt: now } : { teamArchivedAt: null })
		.where(eq(schema.chat.id, chat.id));
	chatPubsub.updated(chat.id);
}

/** Blocks or unblocks the other party of a direct chat for `blockerParticipantId`. */
export async function setChatBlocked({
	chat,
	blockerParticipantId,
	blocked
}: {
	chat: ChatRow;
	blockerParticipantId: string;
	blocked: boolean;
}) {
	const blockedParticipantId =
		chat.participantId === blockerParticipantId ? chat.otherParticipantId : chat.participantId;
	if (chat.kind !== 'DIRECT' || !blockedParticipantId) {
		throw apiError({ code: 'INVALID_INPUT', message: m.chatOnlyDirectCanBeBlocked() });
	}
	if (blocked) {
		await db
			.insert(schema.chatBlock)
			.values({ blockerParticipantId, blockedParticipantId })
			.onConflictDoNothing();
	} else {
		await db
			.delete(schema.chatBlock)
			.where(
				and(
					eq(schema.chatBlock.blockerParticipantId, blockerParticipantId),
					eq(schema.chatBlock.blockedParticipantId, blockedParticipantId)
				)
			);
	}
	chatPubsub.updated(chat.id);
}

/** Whether `blockerParticipantId` blocked the other party of the direct chat. */
export async function hasBlocked({
	chat,
	blockerParticipantId
}: {
	chat: ChatRow;
	blockerParticipantId: string;
}) {
	const blockedParticipantId =
		chat.participantId === blockerParticipantId ? chat.otherParticipantId : chat.participantId;
	if (chat.kind !== 'DIRECT' || !blockedParticipantId) return false;
	const block = await db.query.chatBlock.findFirst({
		where: { blockerParticipantId, blockedParticipantId },
		columns: { id: true }
	});
	return block !== undefined;
}

/** Reports a chat between participants to participant care, who read it while the report is open. */
export async function reportChat({
	chat,
	reporterUserId,
	reason,
	origin
}: {
	chat: ChatRow;
	reporterUserId: string;
	reason: string;
	/** The app's address, which the Slack message about it links to. */
	origin: string;
}) {
	if (chat.kind === 'TEAM') {
		throw apiError({ code: 'INVALID_INPUT', message: m.chatTeamCannotBeReported() });
	}
	const reportId = await db.transaction(async (tx) => {
		const [report] = await tx
			.insert(schema.chatReport)
			.values({ conferenceId: chat.conferenceId, chatId: chat.id, reporterUserId, reason })
			.returning({ id: schema.chatReport.id });
		await tx.update(schema.chat).set({ underReview: true }).where(eq(schema.chat.id, chat.id));
		if (!report) throw new Error('reportChat: the insert returned no row');
		return report.id;
	});
	chatReportPubsub.created();
	chatPubsub.updated(chat.id);
	tellReportOnSlack({ conferenceId: chat.conferenceId, reportId, origin });
}

/** Settles a report; the chat is private again once none of its reports is open. */
export async function resolveChatReport({
	id,
	resolvedById
}: {
	id: string;
	resolvedById: string;
}) {
	const chatId = await db.transaction(async (tx) => {
		const [report] = await tx
			.update(schema.chatReport)
			.set({ status: 'RESOLVED', resolvedById, resolvedAt: new Date() })
			.where(eq(schema.chatReport.id, id))
			.returning({ chatId: schema.chatReport.chatId });
		if (!report) throw apiError({ code: 'NOT_FOUND', message: m.chatReportNotFound() });
		const open = await tx.query.chatReport.findFirst({
			where: { chatId: report.chatId, status: 'OPEN' },
			columns: { id: true }
		});
		if (!open) {
			await tx
				.update(schema.chat)
				.set({ underReview: false })
				.where(eq(schema.chat.id, report.chatId));
		}
		return report.chatId;
	});
	chatReportPubsub.updated(id);
	chatPubsub.updated(chatId);
}

/**
 * Settles every open report of a chat at once, with what participant care noted about it; the
 * chat is private again.
 */
export async function resolveChatReports({
	chatId,
	resolvedById,
	note
}: {
	chatId: string;
	resolvedById: string;
	note: string | null;
}) {
	const ids = await db.transaction(async (tx) => {
		const settled = await tx
			.update(schema.chatReport)
			.set({ status: 'RESOLVED', resolvedById, resolvedAt: new Date(), resolutionNote: note })
			.where(and(eq(schema.chatReport.chatId, chatId), eq(schema.chatReport.status, 'OPEN')))
			.returning({ id: schema.chatReport.id });
		await tx.update(schema.chat).set({ underReview: false }).where(eq(schema.chat.id, chatId));
		return settled.map((report) => report.id);
	});
	if (ids.length > 0) chatReportPubsub.updated(ids);
	chatPubsub.updated(chatId);
	return ids.length;
}

/**
 * How many settled reports there are about chats a person takes part in (their direct chats,
 * their delegation's group and the group of their committee or role), not counting the ones they
 * filed themselves: what participant care sees next to a person of a reported chat, so a
 * repetition shows.
 */
export async function earlierReportCount({
	participantId,
	userId,
	delegationId,
	committeeId = null,
	roleId = null
}: {
	participantId: string;
	userId: string;
	delegationId: string | null;
	committeeId?: string | null;
	roleId?: string | null;
}) {
	const [row] = await db
		.select({ reports: count() })
		.from(schema.chatReport)
		.innerJoin(schema.chat, eq(schema.chat.id, schema.chatReport.chatId))
		.where(
			and(
				eq(schema.chatReport.status, 'RESOLVED'),
				sql`${schema.chatReport.reporterUserId} <> ${userId}`,
				or(
					eq(schema.chat.participantId, participantId),
					eq(schema.chat.otherParticipantId, participantId),
					delegationId ? eq(schema.chat.delegationId, delegationId) : undefined,
					committeeId
						? and(eq(schema.chat.kind, 'COMMITTEE'), eq(schema.chat.committeeId, committeeId))
						: undefined,
					roleId ? and(eq(schema.chat.kind, 'ROLE'), eq(schema.chat.roleId, roleId)) : undefined
				)
			)
		);
	return row?.reports ?? 0;
}

/** The participant row of a user in a conference: who of a chat filed a report. */
export async function participantIdOfUser({
	userId,
	conferenceId
}: {
	userId: string;
	conferenceId: string;
}) {
	const participant = await db.query.conferenceParticipant.findFirst({
		where: { userId, conferenceId },
		columns: { id: true }
	});
	return participant?.id ?? null;
}

/** Takes a person out of the chats between participants, or lets them back in. */
export async function setMessagingSuspended({
	participantId,
	suspended
}: {
	participantId: string;
	suspended: boolean;
}) {
	const [row] = await db
		.update(schema.conferenceParticipant)
		.set({ messagingSuspended: suspended })
		.where(eq(schema.conferenceParticipant.id, participantId))
		.returning({ conferenceId: schema.conferenceParticipant.conferenceId });
	if (!row) throw apiError({ code: 'NOT_FOUND', message: m.chatContactNotFound() });
	forgetContacts(row.conferenceId);
	conferenceParticipantPubsub.updated(participantId);
	// their chats say whether they are suspended, and whether anybody can write in them; so does
	// the group of their seat, for them
	const seat = (await conferenceContacts(row.conferenceId)).get(participantId);
	const chats = await db.query.chat.findMany({
		where: {
			OR: [
				{ participantId },
				{ otherParticipantId: participantId },
				...(seat?.committee
					? [{ kind: 'COMMITTEE' as const, committeeId: seat.committee.id }]
					: []),
				...(seat?.role.kind === 'CUSTOM' ? [{ kind: 'ROLE' as const, roleId: seat.role.id }] : [])
			]
		},
		columns: { id: true }
	});
	if (chats.length > 0) chatPubsub.updated(chats.map((chat) => chat.id));
}

/** Whether a mail tells the user about chat messages they left unread. */
export async function setMessageNotificationEmails({
	userId,
	enabled
}: {
	userId: string;
	enabled: boolean;
}) {
	await db
		.update(schema.user)
		.set({ messageNotificationEmails: enabled })
		.where(eq(schema.user.id, userId));
	userPubsub.updated(userId);
}

/**
 * Whether a mail also tells the user about the groups of their committee or role (on top of
 * `messageNotificationEmails`, which turns off all of them).
 */
export async function setGroupMessageNotificationEmails({
	userId,
	enabled
}: {
	userId: string;
	enabled: boolean;
}) {
	await db
		.update(schema.user)
		.set({ groupMessageNotificationEmails: enabled })
		.where(eq(schema.user.id, userId));
	userPubsub.updated(userId);
}

/** Mutes a group for the user (no unread count, no mail) or unmutes it. */
export async function setChatMuted({
	chat,
	userId,
	muted
}: {
	chat: ChatRow;
	userId: string;
	muted: boolean;
}) {
	if (!isGroupChat(chat.kind)) {
		throw apiError({ code: 'INVALID_INPUT', message: m.chatOnlyGroupsCanBeMuted() });
	}
	if (muted) {
		await db.insert(schema.chatMute).values({ chatId: chat.id, userId }).onConflictDoNothing();
	} else {
		await db
			.delete(schema.chatMute)
			.where(and(eq(schema.chatMute.chatId, chat.id), eq(schema.chatMute.userId, userId)));
	}
	chatPubsub.updated(chat.id);
}

const muteBatcher = createBatcher(async (keys: string[]) => {
	const asked = keys.map((key) => {
		const [userId = '', chatId = ''] = key.split('|');
		return { userId, chatId };
	});
	const rows = await db.query.chatMute.findMany({
		where: {
			chatId: { in: [...new Set(asked.map((one) => one.chatId))] },
			userId: { in: [...new Set(asked.map((one) => one.userId))] }
		},
		columns: { chatId: true, userId: true }
	});
	const muted = new Set(rows.map((row) => `${row.userId}|${row.chatId}`));
	return new Map(keys.map((key) => [key, muted.has(key)]));
});

/** Whether the user muted the group. */
export async function isChatMuted({ userId, chatId }: { userId: string; chatId: string }) {
	return (await muteBatcher(`${userId}|${chatId}`)) ?? false;
}

/** `userId|TEAM|chatId` or `userId|PARTICIPANT|chatId`. */
function unreadKey({ userId, side, chatId }: { userId: string; side: string; chatId: string }) {
	return `${userId}|${side}|${chatId}`;
}

/** Per chat, how many of the participant's messages its inbox has not read. */
async function countInboxUnread(chatIds: string[]) {
	if (chatIds.length === 0) return new Map<string, number>();
	const { chat, chatMessage } = schema;
	const rows = await db
		.select({ chatId: chatMessage.chatId, unread: count() })
		.from(chatMessage)
		.innerJoin(chat, eq(chat.id, chatMessage.chatId))
		.where(
			and(
				inArray(chatMessage.chatId, chatIds),
				eq(chatMessage.fromTeam, false),
				or(isNull(chat.teamReadAt), gt(chatMessage.createdAt, chat.teamReadAt))
			)
		)
		.groupBy(chatMessage.chatId);
	return new Map(rows.map((row) => [row.chatId, row.unread]));
}

/** Per chat, how many messages were written since the person last read it. */
async function countPersonUnread({ userId, chatIds }: { userId: string; chatIds: string[] }) {
	const { chatMessage, chatRead } = schema;
	const lastRead = and(eq(chatRead.chatId, chatMessage.chatId), eq(chatRead.userId, userId));
	const rows = await db
		.select({ chatId: chatMessage.chatId, unread: count() })
		.from(chatMessage)
		.leftJoin(chatRead, lastRead)
		.where(
			and(
				inArray(chatMessage.chatId, chatIds),
				or(isNull(chatRead.readAt), gt(chatMessage.createdAt, chatRead.readAt))
			)
		)
		.groupBy(chatMessage.chatId);
	return new Map(rows.map((row) => [row.chatId, row.unread]));
}

/** The unread counts for a batch of `unreadKey`s: the inboxes' together, each person's on their own. */
async function countUnread(keys: string[]) {
	const asked = keys.map((key) => {
		const [userId = '', side = '', chatId = ''] = key.split('|');
		return { key, userId, side, chatId };
	});
	const ofInboxes = asked.filter((one) => one.side === 'TEAM');
	const ofPeople = Map.groupBy(
		asked.filter((one) => one.side !== 'TEAM'),
		(one) => one.userId
	);
	const [inboxUnread, ...peopleUnread] = await Promise.all([
		countInboxUnread(ofInboxes.map((one) => one.chatId)),
		...[...ofPeople].map(([userId, chats]) =>
			countPersonUnread({ userId, chatIds: chats.map((one) => one.chatId) })
		)
	]);
	const counts = new Map(ofInboxes.map((one) => [one.key, inboxUnread.get(one.chatId) ?? 0]));
	[...ofPeople.values()].forEach((chats, index) => {
		for (const one of chats) counts.set(one.key, peopleUnread[index]?.get(one.chatId) ?? 0);
	});
	return counts;
}

const unreadBatcher = createBatcher(countUnread);

/**
 * How many messages of the chat the caller has not read: for the team side of a team chat what
 * the participant wrote since the inbox last read, for a person what was written since they last
 * read. A group is read by each of its people, the team's too, and counts nothing for somebody who
 * muted it.
 */
export async function unreadCount({
	userId,
	side,
	chat
}: {
	userId: string;
	side: ChatSide;
	chat: Pick<ChatRow, 'id' | 'kind'>;
}) {
	if (side === 'REVIEW') return 0;
	const group = isGroupChat(chat.kind);
	if (group && (await isChatMuted({ userId, chatId: chat.id }))) return 0;
	const key = unreadKey({ userId, side: group ? 'PARTICIPANT' : side, chatId: chat.id });
	return (await unreadBatcher(key)) ?? 0;
}

const lastMessageBatcher = createBatcher(async (chatIds: string[]) => {
	const { chatMessage } = schema;
	const rows = await db
		.selectDistinctOn([chatMessage.chatId], {
			chatId: chatMessage.chatId,
			body: chatMessage.body,
			hiddenAt: chatMessage.hiddenAt,
			fromTeam: chatMessage.fromTeam,
			authorParticipantId: chatMessage.authorParticipantId
		})
		.from(chatMessage)
		.where(inArray(chatMessage.chatId, chatIds))
		.orderBy(chatMessage.chatId, sql`${chatMessage.createdAt} desc`);
	return new Map(rows.map((row) => [row.chatId, row]));
});

/** The latest message of the chat, for the chat list. */
export function lastMessageOf(chatId: string) {
	return lastMessageBatcher(chatId);
}

const userNameBatcher = createBatcher(async (userIds: string[]) => {
	const users = await db.query.user.findMany({
		where: { id: { in: userIds } },
		columns: { id: true, givenName: true, familyName: true }
	});
	return new Map(users.map((user) => [user.id, `${user.givenName} ${user.familyName}`]));
});

/** A person's full name, for the places the chats show one (`chatPermissions.ts` says where). */
export function userNameOf(userId: string) {
	return userNameBatcher(userId);
}

const participantPersonBatcher = createBatcher(async (participantIds: string[]) => {
	const rows = await db.query.conferenceParticipant.findMany({
		where: { id: { in: participantIds } },
		columns: { id: true, userId: true },
		with: { user: { columns: { givenName: true, familyName: true } } }
	});
	return new Map(
		rows.map(({ id, userId, user }) => [
			id,
			{ participantId: id, userId, name: user ? `${user.givenName} ${user.familyName}` : null }
		])
	);
});

/** The account and full name behind a participant row. */
export function personOfParticipant(participantId: string) {
	return participantPersonBatcher(participantId);
}
