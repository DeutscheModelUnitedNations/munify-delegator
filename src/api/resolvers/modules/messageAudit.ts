import { builder } from '../builder';
import {
	findManyMessageAuditQueryObject,
	findUniqueMessageAuditQueryObject,
	MessageAuditIdFieldObject,
	MessageAuditCreatedAtFieldObject,
	MessageAuditUpdatedAtFieldObject,
	MessageAuditSubjectFieldObject,
	MessageAuditBodyFieldObject,
	MessageAuditSenderUserIdFieldObject,
	MessageAuditSenderUserFieldObject,
	MessageAuditRecipientUserIdFieldObject,
	MessageAuditRecipientUserFieldObject,
	MessageAuditConferenceIdFieldObject,
	MessageAuditConferenceFieldObject,
	MessageAuditMessageIdFieldObject,
	MessageAuditStatusFieldObject
} from '$db/generated/graphql/MessageAudit';
import { GraphQLError } from 'graphql';
import {
	sendDelegationMessage,
	getMessageRecipients,
	getMessageHistory,
	getMessageForReply
} from '../../../composers/messagingComposer';

export const GQLMessageAudit = builder.prismaObject('MessageAudit', {
	fields: (t) => ({
		id: t.field(MessageAuditIdFieldObject),
		createdAt: t.field(MessageAuditCreatedAtFieldObject),
		updatedAt: t.field(MessageAuditUpdatedAtFieldObject),
		subject: t.field(MessageAuditSubjectFieldObject),
		body: t.field(MessageAuditBodyFieldObject),
		senderUserId: t.field(MessageAuditSenderUserIdFieldObject),
		senderUser: t.relation('senderUser', MessageAuditSenderUserFieldObject),
		recipientUserId: t.field(MessageAuditRecipientUserIdFieldObject),
		recipientUser: t.relation('recipientUser', MessageAuditRecipientUserFieldObject),
		conferenceId: t.field(MessageAuditConferenceIdFieldObject),
		conference: t.relation('conference', MessageAuditConferenceFieldObject),
		messageId: t.field(MessageAuditMessageIdFieldObject),
		status: t.field(MessageAuditStatusFieldObject)
	})
});

// Simple type for recipient info
const RecipientInfo = builder.simpleObject('RecipientInfo', {
	fields: (t) => ({
		id: t.string(),
		label: t.string(),
		firstName: t.string({ nullable: true }),
		lastName: t.string({ nullable: true }),
		alpha2Code: t.string({ nullable: true }),
		alpha3Code: t.string({ nullable: true }),
		fontAwesomeIcon: t.string({ nullable: true }),
		roleName: t.string({ nullable: true })
	})
});

// Grouped recipients by committee / NSA / custom role
const RecipientGroup = builder.simpleObject('RecipientGroup', {
	fields: (t) => ({
		groupId: t.string(),
		groupLabel: t.string(),
		category: t.string(),
		fontAwesomeIcon: t.string({ nullable: true }),
		recipients: t.field({ type: [RecipientInfo] })
	})
});

// Type for history items
const MessageHistoryItem = builder.simpleObject('MessageHistoryItem', {
	fields: (t) => ({
		recipientLabel: t.string(),
		subject: t.string(),
		body: t.string(),
		sentAt: t.string(),
		status: t.string()
	})
});

// Type for reply message info
const ReplyMessageInfo = builder.simpleObject('ReplyMessageInfo', {
	fields: (t) => ({
		id: t.string(),
		subject: t.string(),
		body: t.string(),
		senderLabel: t.string(),
		senderUserId: t.string(),
		senderFirstName: t.string(),
		senderLastName: t.string(),
		senderAlpha2Code: t.string({ nullable: true }),
		senderAlpha3Code: t.string({ nullable: true }),
		senderFontAwesomeIcon: t.string({ nullable: true }),
		senderRoleName: t.string({ nullable: true }),
		sentAt: t.string()
	})
});

builder.queryFields((t) => {
	const field = findManyMessageAuditQueryObject(t);
	return {
		findManyMessageAudits: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').MessageAudit]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueMessageAuditQueryObject(t);
	return {
		findUniqueMessageAudit: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').MessageAudit]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// Custom query to get message recipients for a conference
builder.queryField('getMessageRecipients', (t) =>
	t.field({
		type: [RecipientGroup],
		args: {
			conferenceId: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();
			try {
				return await getMessageRecipients(args.conferenceId, user.sub);
			} catch (e: unknown) {
				console.error(e);
				const message = e instanceof Error ? e.message : 'Error fetching recipients';
				throw new GraphQLError(message);
			}
		}
	})
);

// Custom query to get message history
builder.queryField('getMessageHistory', (t) =>
	t.field({
		type: [MessageHistoryItem],
		args: {
			conferenceId: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();
			try {
				return await getMessageHistory(args.conferenceId, user.sub);
			} catch (e: unknown) {
				console.error(e);
				const message = e instanceof Error ? e.message : 'Error fetching history';
				throw new GraphQLError(message);
			}
		}
	})
);

// Query to get a message for reply context
builder.queryField('getMessageForReply', (t) =>
	t.field({
		type: ReplyMessageInfo,
		nullable: true,
		args: {
			messageAuditId: t.arg.string({ required: true }),
			conferenceId: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();
			try {
				return await getMessageForReply(args.messageAuditId, args.conferenceId, user.sub);
			} catch (e: unknown) {
				console.error(e);
				const message = e instanceof Error ? e.message : 'Error fetching reply message';
				throw new GraphQLError(message);
			}
		}
	})
);

// Mutation to send a delegation message
builder.mutationField('sendDelegationMessage', (t) =>
	t.field({
		type: 'String',
		args: {
			conferenceId: t.arg.string({ required: true }),
			recipientId: t.arg.string({ required: true }),
			subject: t.arg.string({ required: true }),
			body: t.arg.string({ required: true }),
			replyToMessageId: t.arg.string({ required: false })
		},
		resolve: async (_root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();
			try {
				return await sendDelegationMessage({
					conferenceId: args.conferenceId,
					recipientId: args.recipientId,
					subject: args.subject,
					body: args.body,
					origin: ctx.url.origin,
					senderId: user.sub,
					replyToMessageId: args.replyToMessageId ?? undefined
				});
			} catch (e: unknown) {
				console.error(e);
				const message = e instanceof Error ? e.message : 'Error sending message';
				throw new GraphQLError(message);
			}
		}
	})
);
