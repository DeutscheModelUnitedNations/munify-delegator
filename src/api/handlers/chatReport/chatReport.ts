import { db } from '#api/db/db';
import { object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { assertAllowed } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';
import { assertPartyOfChat } from '#api/handlers/chat/chatPermissions';
import {
	reportChat,
	reportReasonSchema,
	resolveChatReport,
	userNameOf
} from '#api/handlers/chat/chatService';

// The abilities of reports are registered with the chats' (`chatPermissions.ts`).

const ChatReportRef = object({
	table: 'chatReport',
	adjust: (t) => ({
		reporterName: t.string({
			nullable: true,
			description: 'Who reported the chat.',
			resolve: async (report) => (await userNameOf(report.reporterUserId)) ?? null
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
			await reportChat({ chat, reporterUserId: userId, reason: args.reason.trim() });
			return true;
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
