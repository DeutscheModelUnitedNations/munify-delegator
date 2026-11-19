/**
 * Participant care hiding messages of a reported chat for everybody of it. Hiding is final and
 * keeps the text: the parties read a placeholder from then on, participant care and system admins
 * the text, with who hid it and why, also once the report is settled (`hiddenMessagesOfReport`).
 * Who may hide is `chatPermissions.ts`'s (`assertCanModerateChat`); the database keeps it final
 * (`chat_message_hidden_is_final`).
 */
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '#api/db/db';
import { chatMessagePubsub, chatPubsub } from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { createBatcher } from '#api/services/batcher';
import { m } from '#lib/paraglide/messages';
import { CHAT_HIDE_REASON_MAX_LENGTH } from '#lib/helpers/chat';
import type { ChatRow } from './chatService';

/** Why participant care hid a message: required, for the team only. */
export const hideReasonSchema = z
	.string()
	.trim()
	.min(1, { error: () => m.chatHideReasonMissing() })
	.max(CHAT_HIDE_REASON_MAX_LENGTH, {
		error: () => m.chatHideReasonTooLong({ max: CHAT_HIDE_REASON_MAX_LENGTH })
	});

/** What to hide: one message, or everything a person wrote into the chat so far. */
export type HideTarget = { messageId: string } | { authorParticipantId: string };

/**
 * Hides messages of the chat for everybody of it, under its oldest open report, and answers how
 * many it hid. One message that is hidden already is a CONFLICT, one not in the chat NOT_FOUND;
 * a person's messages hide those not hidden yet (none is fine). What the person writes later
 * stays visible.
 */
export async function hideChatMessages({
	chat,
	target,
	hiddenById,
	reason
}: {
	chat: ChatRow;
	target: HideTarget;
	hiddenById: string;
	reason: string;
}) {
	const ids = await db.transaction(async (tx) => {
		const report = await tx.query.chatReport.findFirst({
			where: { chatId: chat.id, status: 'OPEN' },
			orderBy: { createdAt: 'asc' },
			columns: { id: true }
		});
		if ('messageId' in target) {
			const message = await tx.query.chatMessage.findFirst({
				where: { id: target.messageId, chatId: chat.id },
				columns: { id: true, hiddenAt: true }
			});
			if (!message) throw apiError({ code: 'NOT_FOUND', message: m.chatMessageNotFound() });
			if (message.hiddenAt) {
				throw apiError({ code: 'CONFLICT', message: m.chatMessageAlreadyHidden() });
			}
		}
		const which =
			'messageId' in target
				? eq(schema.chatMessage.id, target.messageId)
				: and(
						eq(schema.chatMessage.authorParticipantId, target.authorParticipantId),
						eq(schema.chatMessage.fromTeam, false)
					);
		const hidden = await tx
			.update(schema.chatMessage)
			.set({
				hiddenAt: new Date(),
				hiddenById,
				hiddenReason: reason,
				hiddenReportId: report?.id ?? null
			})
			.where(
				and(eq(schema.chatMessage.chatId, chat.id), isNull(schema.chatMessage.hiddenAt), which)
			)
			.returning({ id: schema.chatMessage.id });
		return hidden.map((row) => row.id);
	});
	if (ids.length > 0) {
		chatMessagePubsub.updated(ids);
		// the chat list's preview of the latest message
		chatPubsub.updated(chat.id);
	}
	return ids.length;
}

/** A hidden message as the record of a report keeps it. */
export interface HiddenMessage {
	id: string;
	body: string;
	createdAt: Date;
	authorParticipantId: string | null;
	hiddenAt: Date;
	hiddenById: string | null;
	hiddenReason: string;
}

const hiddenBatcher = createBatcher(async (reportIds: string[]) => {
	const rows = await db
		.select({
			id: schema.chatMessage.id,
			reportId: schema.chatMessage.hiddenReportId,
			body: schema.chatMessage.body,
			createdAt: schema.chatMessage.createdAt,
			authorParticipantId: schema.chatMessage.authorParticipantId,
			hiddenAt: schema.chatMessage.hiddenAt,
			hiddenById: schema.chatMessage.hiddenById,
			hiddenReason: schema.chatMessage.hiddenReason
		})
		.from(schema.chatMessage)
		.where(inArray(schema.chatMessage.hiddenReportId, reportIds))
		.orderBy(asc(schema.chatMessage.createdAt));
	const byReport = new Map<string, HiddenMessage[]>();
	for (const { reportId, hiddenAt, hiddenReason, ...row } of rows) {
		// the check constraint sets both together; a row without them was not hidden
		if (!reportId || !hiddenAt || hiddenReason === null) continue;
		byReport.set(reportId, [...(byReport.get(reportId) ?? []), { ...row, hiddenAt, hiddenReason }]);
	}
	return byReport;
});

/**
 * The messages hidden under a report, the oldest first: the record participant care keeps of a
 * case, also once it is settled and the chat is private again.
 */
export async function hiddenMessagesOfReport(reportId: string) {
	return (await hiddenBatcher(reportId)) ?? [];
}
