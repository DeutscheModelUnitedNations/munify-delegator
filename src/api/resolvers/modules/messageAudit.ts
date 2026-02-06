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
	getMessageHistory
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
		label: t.string()
	})
});

// Type for history items
const MessageHistoryItem = builder.simpleObject('MessageHistoryItem', {
	fields: (t) => ({
		recipientLabel: t.string(),
		subject: t.string(),
		sentAt: t.string(),
		status: t.string()
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
		type: [RecipientInfo],
		args: {
			conferenceId: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();
			try {
				return await getMessageRecipients(args.conferenceId, user.sub);
			} catch (e: any) {
				console.error(e);
				throw new GraphQLError(e.message || 'Error fetching recipients');
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
			} catch (e: any) {
				console.error(e);
				throw new GraphQLError(e.message || 'Error fetching history');
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
			replyUrl: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();
			try {
				return await sendDelegationMessage({
					conferenceId: args.conferenceId,
					recipientId: args.recipientId,
					subject: args.subject,
					body: args.body,
					replyUrl: args.replyUrl,
					senderId: user.sub
				});
			} catch (e: any) {
				console.error(e);
				throw new GraphQLError(e.message || 'Error sending message');
			}
		}
	})
);
