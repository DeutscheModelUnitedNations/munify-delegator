import { db } from '#api/db/db';
import { object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { assertAllowed } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';
import { assertCanSettleReportsOf, assertPartyOfChat } from '#api/handlers/chat/chatPermissions';
import {
	participantIdOfUser,
	personOfParticipant,
	reportChat,
	reportReasonSchema,
	resolveChatReport,
	resolveChatReports,
	userNameOf
} from '#api/handlers/chat/chatService';

import { reportNoteSchema } from '#api/handlers/chat/reportNote';
import { hiddenMessagesOfReport, type HiddenMessage } from '#api/handlers/chat/chatModeration';

// The abilities of reports are registered with the chats' (`chatPermissions.ts`).

const HiddenChatMessage = schemaBuilder.objectRef<HiddenMessage>('HiddenChatMessage');
HiddenChatMessage.implement({
	description:
		'A message participant care hid while the report was open, as the record keeps it: the text, who wrote it, who hid it and why.',
	fields: (t) => ({
		id: t.exposeID('id'),
		body: t.exposeString('body'),
		createdAt: t.field({ type: 'DateTime', resolve: (message) => message.createdAt }),
		authorParticipantId: t.exposeID('authorParticipantId', { nullable: true }),
		authorName: t.string({
			nullable: true,
			description: 'Who wrote it; null once their participation is gone.',
			resolve: async (message) =>
				message.authorParticipantId
					? ((await personOfParticipant(message.authorParticipantId))?.name ?? null)
					: null
		}),
		hiddenAt: t.field({ type: 'DateTime', resolve: (message) => message.hiddenAt }),
		hiddenReason: t.exposeString('hiddenReason'),
		hiddenByName: t.string({
			nullable: true,
			resolve: async (message) =>
				message.hiddenById ? ((await userNameOf(message.hiddenById)) ?? null) : null
		})
	})
});

const ChatReportRef = object({
	table: 'chatReport',
	adjust: (t) => ({
		reporterName: t.string({
			nullable: true,
			description: 'Who reported the chat.',
			resolve: async (report) => (await userNameOf(report.reporterUserId)) ?? null
		}),
		reporterParticipantId: t.id({
			nullable: true,
			description:
				"The reporter's participant row in the conference: which of the chat's people it was.",
			resolve: (report) =>
				participantIdOfUser({ userId: report.reporterUserId, conferenceId: report.conferenceId })
		}),
		resolvedByName: t.string({
			nullable: true,
			description: 'Who settled the report.',
			resolve: async (report) =>
				report.resolvedById ? ((await userNameOf(report.resolvedById)) ?? null) : null
		}),
		// whoever reads the report reads the record of its case: participant care and system admins
		hiddenMessages: t.field({
			type: [HiddenChatMessage],
			description:
				'The messages participant care hid while this report was the oldest open one of its chat, the oldest first; kept with the report once it is settled and the chat is private again.',
			resolve: (report) => hiddenMessagesOfReport(report.id)
		})
	})
});
query({ table: 'chatReport' });

schemaBuilder.mutationFields((t) => ({
	reportChat: t.field({
		description:
			'Asks participant care to look at a direct chat or a delegation group the caller is a party of (FORBIDDEN otherwise): while the report is open, participant care reads the chat.',
		type: 'Boolean',
		args: {
			chatId: t.arg.id({ required: true }),
			reason: t.arg.string({ required: true }).validate(reportReasonSchema)
		},
		resolve: async (_root, args, ctx) => {
			const { chat, userId } = await assertPartyOfChat({ ctx, id: args.chatId });
			await reportChat({
				chat,
				reporterUserId: userId,
				reason: args.reason.trim(),
				origin: ctx.requestUrl().origin
			});
			return true;
		}
	}),

	resolveChatReports: t.field({
		description:
			"Settles every open report of a chat at once, with an optional note for the team, and answers how many it settled; the chat is private again. Participant care of the chat's conference only (NOT_FOUND otherwise, and for a chat without an open report).",
		type: 'Int',
		args: {
			chatId: t.arg.id({ required: true }),
			note: t.arg.string().validate(reportNoteSchema)
		},
		resolve: async (_root, args, ctx) => {
			const resolvedById = ctx.mustBeLoggedIn().sub;
			const chat = await assertCanSettleReportsOf({ ctx, chatId: args.chatId });
			return resolveChatReports({
				chatId: chat.id,
				resolvedById,
				note: args.note?.trim() || null
			});
		}
	}),

	resolveChatReport: t.drizzleField({
		description:
			'Settles a report. Once none of its reports is open the chat is private again. Participant care of its conference only (NOT_FOUND otherwise).',
		type: ChatReportRef,
		args: { id: t.arg.id({ required: true }) },
		resolve: async (select, _root, args, ctx) => {
			const resolvedById = ctx.mustBeLoggedIn().sub;
			await assertAllowed({
				ctx,
				table: 'chatReport',
				action: 'update',
				id: args.id,
				options: { message: m.chatReportNotFound }
			});
			await resolveChatReport({ id: args.id, resolvedById });
			return db.query.chatReport
				.findFirst(
					select(
						(await ctx.abilities.chatReport.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
