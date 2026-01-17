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
import { db } from '$db/db';
import { GraphQLError } from 'graphql';
import { renderDelegationMessageEmail } from '$api/services/email/delegationMessageTemplates';
import { emailService } from '$api/services/email/emailService';

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
			const userId = user.sub;

			console.log('[getMessageRecipients] User:', userId, 'Conference:', args.conferenceId);

			// Get current user's delegation member to find their delegationId
			const currentDelegationMember = await db.delegationMember.findUnique({
				where: {
					conferenceId_userId: {
						conferenceId: args.conferenceId,
						userId: userId
					}
				},
				select: {
					delegationId: true
				}
			});

			if (!currentDelegationMember?.delegationId) {
				console.log('[getMessageRecipients] User is not part of a delegation');
				return [];
			}

			console.log(
				'[getMessageRecipients] User delegation ID:',
				currentDelegationMember.delegationId
			);

			// Fetch delegation members in the SAME delegation (excluding current user)
			const delegationMembers = await db.delegationMember.findMany({
				where: {
					delegationId: currentDelegationMember.delegationId,
					userId: { not: userId }
				},
				include: {
					user: {
						select: {
							id: true,
							given_name: true,
							family_name: true
						}
					},
					delegation: {
						include: {
							assignedNation: true,
							assignedNonStateActor: true
						}
					},
					assignedCommittee: true
				}
			});

			console.log('[getMessageRecipients] Delegation members found:', delegationMembers.length);

			// Build recipient list
			const recipients: Array<{ id: string; label: string }> = [];

			for (const member of delegationMembers) {
				if (!member.user) continue;
				const userObj = member.user;
				const name = `${userObj.given_name} ${userObj.family_name}`;
				const roleLabel = getDelegateLabel(userObj, member, null);
				const label = roleLabel ? `${name} - ${roleLabel}` : name;
				recipients.push({ id: userObj.id, label });
			}

			// Sort by label
			recipients.sort((a, b) => a.label.localeCompare(b.label));

			console.log('[getMessageRecipients] Final recipients count:', recipients.length);

			return recipients;
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
			const userId = user.sub;

			const audits = await db.messageAudit.findMany({
				where: {
					senderUserId: userId,
					conferenceId: args.conferenceId
				},
				orderBy: { createdAt: 'desc' },
				select: {
					subject: true,
					createdAt: true,
					status: true,
					recipientUserId: true,
					recipientUser: {
						select: {
							id: true,
							given_name: true,
							family_name: true
						}
					}
				}
			});

			if (audits.length === 0) {
				return [];
			}

			const recipientIds = Array.from(new Set(audits.map((audit) => audit.recipientUserId)));

			const delegationMembers = await db.delegationMember.findMany({
				where: {
					conferenceId: args.conferenceId,
					userId: { in: recipientIds }
				},
				include: {
					delegation: {
						include: {
							assignedNation: true,
							assignedNonStateActor: true
						}
					},
					assignedCommittee: true
				}
			});

			const delegationByUserId = new Map(
				delegationMembers.map((member) => [member.userId, member])
			);

			const singleParticipants = await db.singleParticipant.findMany({
				where: {
					conferenceId: args.conferenceId,
					userId: { in: recipientIds }
				},
				include: {
					assignedRole: true
				}
			});

			const singleByUserId = new Map(
				singleParticipants.map((participant) => [participant.userId, participant])
			);

			const items = audits.map((audit) => {
				const recipient = audit.recipientUser;
				const delegationMember = delegationByUserId.get(audit.recipientUserId) ?? null;
				const singleParticipant = !delegationMember
					? (singleByUserId.get(audit.recipientUserId) ?? null)
					: null;
				const roleLabel = recipient
					? getDelegateLabel(recipient, delegationMember, singleParticipant)
					: 'Participant';
				const recipientLabel =
					roleLabel !== 'Participant' && roleLabel
						? roleLabel
						: recipient
							? `${recipient.given_name} ${recipient.family_name}`
							: 'Participant';
				const status = audit.status.charAt(0) + audit.status.slice(1).toLowerCase();

				return {
					recipientLabel,
					subject: audit.subject,
					sentAt: audit.createdAt.toISOString(),
					status
				};
			});

			return items;
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
			const senderId = user.sub;

			// Validate inputs
			if (!args.recipientId.trim() || !args.subject.trim() || !args.body.trim()) {
				throw new GraphQLError('Missing required fields');
			}

			if (args.recipientId === senderId) {
				throw new GraphQLError('Cannot send message to yourself');
			}

			// Get sender info
			const sender = await db.user.findUnique({
				where: { id: senderId },
				select: {
					canReceiveDelegationMail: true,
					id: true,
					given_name: true,
					family_name: true
				}
			});

			if (!sender) {
				throw new GraphQLError('Sender not found');
			}

			if (!sender.canReceiveDelegationMail) {
				throw new GraphQLError('You must enable messaging in your account settings.');
			}

			// Get recipient info
			const recipient = await db.user.findUnique({
				where: { id: args.recipientId },
				select: {
					canReceiveDelegationMail: true,
					email: true,
					id: true
				}
			});

			if (!recipient) {
				throw new GraphQLError('Recipient not found');
			}

			if (!recipient.canReceiveDelegationMail) {
				throw new GraphQLError('Recipient has not enabled messaging.');
			}

			// Get conference info
			const conference = await db.conference.findUnique({
				where: { id: args.conferenceId },
				select: { title: true }
			});

			if (!conference) {
				throw new GraphQLError('Conference not found');
			}

			// Verify sender is part of conference
			const senderDelegationMember = await db.delegationMember.findUnique({
				where: {
					conferenceId_userId: {
						conferenceId: args.conferenceId,
						userId: sender.id
					}
				},
				include: {
					delegation: {
						include: {
							assignedNation: true,
							assignedNonStateActor: true
						}
					},
					assignedCommittee: true
				}
			});

			let senderSingleParticipant = null as {
				assignedRole: { name: string } | null;
			} | null;
			if (!senderDelegationMember) {
				senderSingleParticipant = await db.singleParticipant.findUnique({
					where: {
						conferenceId_userId: {
							conferenceId: args.conferenceId,
							userId: sender.id
						}
					},
					include: {
						assignedRole: true
					}
				});
			}

			if (!senderDelegationMember && !senderSingleParticipant) {
				throw new GraphQLError('Sender is not part of this conference');
			}

			const senderLabel = getDelegateLabel(sender, senderDelegationMember, senderSingleParticipant);

			// Verify recipient is part of conference
			const recipientDelegationMember = await db.delegationMember.findUnique({
				where: {
					conferenceId_userId: {
						conferenceId: args.conferenceId,
						userId: recipient.id
					}
				}
			});

			let recipientSingleParticipant = null as {
				assignedRole: { name: string } | null;
			} | null;
			if (!recipientDelegationMember) {
				recipientSingleParticipant = await db.singleParticipant.findUnique({
					where: {
						conferenceId_userId: {
							conferenceId: args.conferenceId,
							userId: recipient.id
						}
					},
					include: {
						assignedRole: true
					}
				});
			}

			if (!recipientDelegationMember && !recipientSingleParticipant) {
				throw new GraphQLError('Recipient is not part of this conference');
			}

			// Create audit record
			const audit = await db.messageAudit.create({
				data: {
					subject: args.subject,
					body: args.body,
					senderUserId: sender.id,
					recipientUserId: recipient.id,
					conferenceId: args.conferenceId,
					status: 'SENT'
				}
			});

			// Render email
			const { html, text } = await renderDelegationMessageEmail({
				senderLabel,
				subject: args.subject,
				messageBody: args.body,
				conferenceTitle: conference.title,
				replyUrl: args.replyUrl
			});

			// Send email
			const result = await emailService.sendEmail({
				to: recipient.email,
				subject: `[${conference.title}] Neue Nachricht: ${args.subject}`,
				html,
				text
			});

			if (!result.success) {
				console.error('Email sending failed', result.error);

				await db.messageAudit.update({
					where: { id: audit.id },
					data: { status: 'FAILED' }
				});

				throw new GraphQLError('Failed to send email');
			}

			// Update audit with message ID
			if (result.messageId) {
				await db.messageAudit.update({
					where: { id: audit.id },
					data: { messageId: result.messageId }
				});
			}

			return 'ok';
		}
	})
);

// Helper function to generate delegate label
function getInitials(firstName: string, lastName: string) {
	return `${firstName.charAt(0)}.${lastName.charAt(0)}.`;
}

function getDelegateLabel(
	user: { given_name: string; family_name: string },
	delegationMember: {
		delegation: {
			assignedNation: { alpha3Code: string } | null;
			assignedNonStateActor: { name: string } | null;
		};
		assignedCommittee: { abbreviation: string | null; name: string } | null;
	} | null,
	singleParticipant: {
		assignedRole: { name: string } | null;
	} | null
): string {
	let label = 'Participant';

	if (delegationMember) {
		if (delegationMember.delegation.assignedNation) {
			// Import countries here to avoid issues
			// For now, use simple alpha3Code
			const alpha3Code = delegationMember.delegation.assignedNation.alpha3Code;
			label = alpha3Code;

			if (delegationMember.assignedCommittee) {
				label += ` (${delegationMember.assignedCommittee.abbreviation || delegationMember.assignedCommittee.name})`;
			}
		} else if (delegationMember.delegation.assignedNonStateActor) {
			label = delegationMember.delegation.assignedNonStateActor.name;
			const initials = getInitials(user.given_name, user.family_name);
			label += ` (${initials})`;
		}
	} else if (singleParticipant) {
		if (singleParticipant.assignedRole) {
			const initials = getInitials(user.given_name, user.family_name);
			label = `${singleParticipant.assignedRole.name} (${initials})`;
		}
	}
	return label;
}
