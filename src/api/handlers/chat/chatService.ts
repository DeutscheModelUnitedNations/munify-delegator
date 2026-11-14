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
import { acceptedMessagingTerms, MESSAGING_TERMS_VERSION } from '#lib/helpers/messagingTerms';
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

/**
 * A team inbox, with the committee of a chairs' or consultants' one, or the one trusted person it
 * is (`id` is their function's, which names them without their account).
 */
export interface InboxOption {
	inbox: ChatInbox;
	committee: { id: string; abbreviation: string; name: string } | null;
	person: { id: string; userId: string; name: string } | null;
}

const byText = (a: string | undefined, b: string | undefined) => (a ?? '').localeCompare(b ?? '');

/**
 * The team inboxes of the conference that somebody answers: participant care, the trusted persons
 * together and each of them alone, and each committee function a team member holds.
 */
async function conferenceInboxes(conferenceId: string): Promise<InboxOption[]> {
	const functions = await db.query.teamFunction.findMany({
		where: { teamMember: { conferenceId } },
		columns: { id: true, kind: true },
		with: {
			committee: { columns: { id: true, abbreviation: true, name: true } },
			teamMember: {
				columns: { userId: true },
				with: { user: { columns: { givenName: true, familyName: true } } }
			}
		}
	});
	const committeeInboxes = new Map<string, InboxOption>();
	const trusted: InboxOption[] = [];
	for (const { id, kind, committee, teamMember } of functions) {
		if (committee) {
			committeeInboxes.set(`${committee.id}/${kind}`, { inbox: kind, committee, person: null });
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
	const key = { kind: 'DIRECT' as const, participantId, otherParticipantId };
	return findOrCreateChat({ where: key, values: { conferenceId, ...key } });
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
	const key = { kind: 'DELEGATION' as const, delegationId };
	return findOrCreateChat({ where: key, values: { conferenceId, ...key } });
}

/** The chat of a participant with a team inbox that reaches them, opened when there is none yet. */
export async function openTeamChat({
	conferenceId,
	participantId,
	inbox,
	committeeId,
	trustedUserId = null
}: {
	conferenceId: string;
	participantId: string;
	inbox: ChatInbox;
	committeeId: string | null;
	/** The one trusted person to write to; null for their shared inbox and every other one */
	trustedUserId?: string | null;
}) {
	await assertMessagingOn(conferenceId);
	const reaching = await inboxesReaching({ conferenceId, participantId });
	const wanted = {
		inbox,
		committeeId: inbox === 'CHAIR' || inbox === 'CONSULTANT' ? committeeId : null,
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
			// the trusted persons' shared chat is the one naming none of them
			trustedUserId: orNone(wanted.trustedUserId)
		},
		values: { conferenceId, kind: 'TEAM', participantId, ...wanted }
	});
}

/** Whether an inbox is the one a chat names: by its kind, its committee and its trusted person. */
export function sameInbox({
	option,
	wanted
}: {
	option: InboxOption;
	wanted: { inbox: ChatInbox | null; committeeId: string | null; trustedUserId: string | null };
}) {
	return (
		option.inbox === wanted.inbox &&
		(option.committee?.id ?? null) === wanted.committeeId &&
		(option.person?.userId ?? null) === wanted.trustedUserId
	);
}

/**
 * The account behind a trusted person as `chatInboxes` names them (their function's id); CONFLICT
 * when nobody of the conference is that trusted person (any more).
 */
export async function trustedUserIdOf({
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
 * How many settled reports there are about chats a person takes part in (their direct chats and
 * their delegation's group), not counting the ones they filed themselves: what participant care
 * sees next to a person of a reported chat, so a repetition shows.
 */
export async function earlierReportCount({
	participantId,
	userId,
	delegationId
}: {
	participantId: string;
	userId: string;
	delegationId: string | null;
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
					delegationId ? eq(schema.chat.delegationId, delegationId) : undefined
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

/** Whether the user accepted the message service's terms as they stand. */
export async function hasAcceptedTerms(userId: string) {
	const user = await db.query.user.findFirst({
		where: { id: userId },
		columns: { messagingTermsVersion: true }
	});
	return acceptedMessagingTerms(user?.messagingTermsVersion);
}

/** Records that the user accepted the message service's terms as they stand. */
export async function acceptMessagingTerms(userId: string) {
	await db
		.update(schema.user)
		.set({ messagingTermsVersion: MESSAGING_TERMS_VERSION, messagingTermsAcceptedAt: new Date() })
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
