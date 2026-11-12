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
	writeRefusal,
	type ChatInbox,
	type ChatSide,
	type WriteRefusal
} from '#lib/helpers/chat';
import { refusalText } from '#lib/helpers/chatRefusalText';
import { conferenceContacts, forgetContacts } from './chatContacts';

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

function refused(reason: WriteRefusal) {
	return apiError({ code: 'CONFLICT', message: refusalText(reason) });
}

async function messagingFlags(conferenceId: string) {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { messagingEnabled: true, assignmentReleased: true }
	});
	if (!conference) throw apiError({ code: 'NOT_FOUND', message: m.conferenceNotFound() });
	return conference;
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
	const counterpartId =
		chat.participantId === writerParticipantId ? chat.otherParticipantId : chat.participantId;
	const direct = chat.kind === 'DIRECT' && writerParticipantId && counterpartId;
	return writeRefusal({
		kind: chat.kind,
		side,
		...flags,
		writerSeated: writer !== undefined,
		writerSuspended: writer?.suspended ?? false,
		counterpartSeated: counterpartId ? contacts.has(counterpartId) : false,
		blocked: direct ? await isBlocked({ a: writerParticipantId, b: counterpartId }) : false
	});
}

/** A team inbox, with the committee of a chairs' or consultants' one. */
export interface InboxOption {
	inbox: ChatInbox;
	committee: { id: string; abbreviation: string; name: string } | null;
}

/** The team inboxes of the conference that somebody answers: participant care, and each function a team member holds. */
async function conferenceInboxes(conferenceId: string): Promise<InboxOption[]> {
	const functions = await db.query.teamFunction.findMany({
		where: { committee: { conferenceId } },
		columns: { kind: true },
		with: { committee: { columns: { id: true, abbreviation: true, name: true } } }
	});
	const committeeInboxes = new Map<string, InboxOption>();
	for (const { kind, committee } of functions) {
		committeeInboxes.set(`${committee.id}/${kind}`, { inbox: kind, committee });
	}
	return [
		{ inbox: 'PARTICIPANT_CARE', committee: null },
		...[...committeeInboxes.values()].sort(
			(a, b) =>
				(a.committee?.abbreviation ?? '').localeCompare(b.committee?.abbreviation ?? '') ||
				a.inbox.localeCompare(b.inbox)
		)
	];
}

/**
 * The team inboxes that write with the participant (`inboxReaches`): participant care always, a
 * committee's chairs and consultants once the participant's seat is released.
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
	if (!flags.messagingEnabled) return [];
	const contact = flags.assignmentReleased ? contacts.get(participantId) : undefined;
	const person = contact ? { committeeId: contact.committee?.id ?? null } : null;
	return inboxes.filter(({ inbox, committee }) =>
		inboxReaches({ inbox, committeeId: committee?.id ?? null, person })
	);
}

async function assertMessagingOn(conferenceId: string) {
	const flags = await messagingFlags(conferenceId);
	if (!flags.messagingEnabled) throw refused('DISABLED');
	return flags;
}

/** The chat matching `values`, created when there is none yet. */
async function findOrCreateChat(values: typeof schema.chat.$inferInsert) {
	const key = {
		kind: values.kind,
		...(values.participantId ? { participantId: values.participantId } : {}),
		...(values.otherParticipantId ? { otherParticipantId: values.otherParticipantId } : {}),
		...(values.delegationId ? { delegationId: values.delegationId } : {}),
		...(values.inbox ? { inbox: values.inbox } : {}),
		...(values.committeeId ? { committeeId: values.committeeId } : {})
	};
	const found = await db.query.chat.findFirst({ where: key });
	if (found) return found;
	// two people opening the same chat at once: the unique index lets one insert through
	const [created] = await db.insert(schema.chat).values(values).onConflictDoNothing().returning();
	if (created) {
		chatPubsub.created();
		return created;
	}
	const raced = await db.query.chat.findFirst({ where: key });
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
	const flags = await assertMessagingOn(conferenceId);
	if (!flags.assignmentReleased) throw refused('NOT_RELEASED');
	const contacts = await conferenceContacts(conferenceId);
	if (fromParticipantId === toParticipantId || !contacts.has(fromParticipantId)) {
		throw refused('NOT_SEATED');
	}
	if (!contacts.has(toParticipantId)) {
		throw apiError({ code: 'NOT_FOUND', message: m.chatContactNotFound() });
	}
	const [participantId, otherParticipantId] = [fromParticipantId, toParticipantId].sort();
	return findOrCreateChat({ conferenceId, kind: 'DIRECT', participantId, otherParticipantId });
}

/** The group chat of a delegation that holds a role, opened when it has none yet. */
export async function openDelegationChat({
	conferenceId,
	delegationId
}: {
	conferenceId: string;
	delegationId: string;
}) {
	const flags = await assertMessagingOn(conferenceId);
	if (!flags.assignmentReleased) throw refused('NOT_RELEASED');
	const delegation = await db.query.delegation.findFirst({
		where: { id: delegationId, conferenceId, assignedRoleId: { isNotNull: true } },
		columns: { id: true }
	});
	if (!delegation) throw refused('NOT_SEATED');
	return findOrCreateChat({ conferenceId, kind: 'DELEGATION', delegationId });
}

/** The chat of a participant with a team inbox that reaches them, opened when there is none yet. */
export async function openTeamChat({
	conferenceId,
	participantId,
	inbox,
	committeeId
}: {
	conferenceId: string;
	participantId: string;
	inbox: ChatInbox;
	committeeId: string | null;
}) {
	await assertMessagingOn(conferenceId);
	const reaching = await inboxesReaching({ conferenceId, participantId });
	const wanted = inbox === 'PARTICIPANT_CARE' ? null : committeeId;
	if (
		!reaching.some((option) => option.inbox === inbox && (option.committee?.id ?? null) === wanted)
	) {
		throw apiError({ code: 'CONFLICT', message: m.chatInboxNotAvailable() });
	}
	return findOrCreateChat({
		conferenceId,
		kind: 'TEAM',
		participantId,
		inbox,
		committeeId: wanted
	});
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
	paperId
}: {
	chat: ChatRow;
	author: MessageAuthor;
	body: string;
	paperId: string | null;
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
			.set({
				lastMessageAt: now,
				// an answer from the inbox means the inbox has read what came before
				...(fromTeam ? { teamReadAt: now } : {}),
				...(chat.kind === 'TEAM' && !fromTeam ? { lastParticipantMessageAt: now } : {})
			})
			.where(eq(schema.chat.id, chat.id));
		// whoever writes has read the chat; the inbox's reading is `teamReadAt`
		if (!fromTeam) await writeRead({ tx, chatId: chat.id, userId: author.userId, readAt: now });
		if (!message) throw new Error('sendMessage: the insert returned no row');
		return message.id;
	});
	chatMessagePubsub.created();
	chatPubsub.updated(chat.id);
	// the lists show chats that hold a message: with its first one a chat comes into them, which
	// a list only hears of as a new row
	if (!chat.lastMessageAt) chatPubsub.created();
	return id;
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
	if (side === 'TEAM') {
		await db.update(schema.chat).set({ teamReadAt: now }).where(eq(schema.chat.id, chat.id));
	} else {
		await writeRead({ tx: db, chatId: chat.id, userId, readAt: now });
	}
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
	reason
}: {
	chat: ChatRow;
	reporterUserId: string;
	reason: string;
}) {
	if (chat.kind === 'TEAM') {
		throw apiError({ code: 'INVALID_INPUT', message: m.chatTeamCannotBeReported() });
	}
	await db.transaction(async (tx) => {
		await tx
			.insert(schema.chatReport)
			.values({ conferenceId: chat.conferenceId, chatId: chat.id, reporterUserId, reason });
		await tx.update(schema.chat).set({ underReview: true }).where(eq(schema.chat.id, chat.id));
	});
	chatReportPubsub.created();
	chatPubsub.updated(chat.id);
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
	// their chats say whether they are suspended, and whether anybody can write in them
	const chats = await db.query.chat.findMany({
		where: { OR: [{ participantId }, { otherParticipantId: participantId }] },
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
 * How many messages of the chat the caller has not read: for the team side what the participant
 * wrote since the inbox last read, for a person what was written since they last read.
 */
export async function unreadCount(args: { userId: string; side: ChatSide; chatId: string }) {
	if (args.side === 'REVIEW') return 0;
	return (await unreadBatcher(unreadKey(args))) ?? 0;
}

const lastMessageBatcher = createBatcher(async (chatIds: string[]) => {
	const { chatMessage } = schema;
	const rows = await db
		.selectDistinctOn([chatMessage.chatId], {
			chatId: chatMessage.chatId,
			body: chatMessage.body,
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
