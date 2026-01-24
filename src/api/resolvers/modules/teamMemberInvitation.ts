import { builder } from '../builder';
import {
	TeamMemberInvitationIdFieldObject,
	TeamMemberInvitationEmailFieldObject,
	TeamMemberInvitationRoleFieldObject,
	TeamMemberInvitationExpiresAtFieldObject,
	TeamMemberInvitationUsedAtFieldObject,
	TeamMemberInvitationRevokedAtFieldObject,
	TeamMemberInvitationConferenceFieldObject,
	TeamMemberInvitationInvitedByFieldObject,
	TeamMemberInvitationAcceptedByFieldObject,
	TeamMemberInvitationCreatedAtFieldObject,
	findManyTeamMemberInvitationQueryObject
} from '$db/generated/graphql/TeamMemberInvitation';
import { TeamRole } from '$db/generated/graphql/inputs';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';
import {
	makeInvitationToken,
	hashToken,
	getInvitationExpiryDate
} from '$api/services/invitationToken';
import {
	sendTeamInvitationEmail,
	sendTeamWelcomeEmail
} from '$api/services/email/sendTeamInvitationEmail';
import { translateTeamRole } from '$lib/services/enumTranslations';

// Define the TeamMemberInvitation object (don't expose the token hash!)
builder.prismaObject('TeamMemberInvitation', {
	fields: (t) => ({
		id: t.field(TeamMemberInvitationIdFieldObject),
		email: t.field(TeamMemberInvitationEmailFieldObject),
		role: t.field(TeamMemberInvitationRoleFieldObject),
		expiresAt: t.field(TeamMemberInvitationExpiresAtFieldObject),
		usedAt: t.field(TeamMemberInvitationUsedAtFieldObject),
		revokedAt: t.field(TeamMemberInvitationRevokedAtFieldObject),
		conference: t.relation('conference', TeamMemberInvitationConferenceFieldObject),
		invitedBy: t.relation('invitedBy', TeamMemberInvitationInvitedByFieldObject),
		acceptedBy: t.relation('acceptedBy', TeamMemberInvitationAcceptedByFieldObject),
		createdAt: t.field(TeamMemberInvitationCreatedAtFieldObject),
		// Custom field to check if user already exists
		userExists: t.boolean({
			resolve: async (parent) => {
				const user = await db.user.findUnique({
					where: { email: parent.email }
				});
				return !!user;
			}
		})
	})
});

// Query to list pending invitations for a conference
builder.queryFields((t) => {
	const field = findManyTeamMemberInvitationQueryObject(t);
	return {
		findManyTeamMemberInvitations: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx, info) => {
				ctx.permissions.getLoggedInUserOrThrow();

				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').TeamMemberInvitation]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// Input type for checking emails
const CheckEmailInput = builder.inputType('CheckEmailInput', {
	fields: (t) => ({
		email: t.string()
	})
});

// Result type for email status check
const EmailStatusResult = builder.simpleObject('EmailStatusResult', {
	fields: (t) => ({
		email: t.string(),
		status: t.string(), // 'exists' | 'new_user' | 'pending_invitation' | 'already_member'
		userId: t.string({ nullable: true }),
		pendingInvitationId: t.string({ nullable: true })
	})
});

// Query to check email statuses
builder.queryFields((t) => ({
	checkTeamInvitationEmails: t.field({
		type: [EmailStatusResult],
		args: {
			conferenceId: t.arg.string(),
			emails: t.arg({ type: [CheckEmailInput] })
		},
		resolve: async (root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Check permission - must be team coordinator, project management, or admin
			const hasPermission = await canManageInvitations(user.sub, args.conferenceId, user);
			if (!hasPermission) {
				throw new GraphQLError('You do not have permission to manage team invitations');
			}

			const results: {
				email: string;
				status: string;
				userId: string | null;
				pendingInvitationId: string | null;
			}[] = [];

			for (const { email } of args.emails) {
				const normalizedEmail = email.toLowerCase().trim();

				// Check if already a team member
				const teamMember = await db.teamMember.findFirst({
					where: {
						conferenceId: args.conferenceId,
						user: { email: normalizedEmail }
					},
					include: { user: true }
				});

				if (teamMember) {
					results.push({
						email: normalizedEmail,
						status: 'already_member',
						userId: teamMember.userId,
						pendingInvitationId: null
					});
					continue;
				}

				// Check if there's a pending invitation
				const pendingInvitation = await db.teamMemberInvitation.findFirst({
					where: {
						conferenceId: args.conferenceId,
						email: normalizedEmail,
						usedAt: null,
						revokedAt: null,
						expiresAt: { gt: new Date() }
					}
				});

				if (pendingInvitation) {
					results.push({
						email: normalizedEmail,
						status: 'pending_invitation',
						userId: null,
						pendingInvitationId: pendingInvitation.id
					});
					continue;
				}

				// Check if user exists
				const existingUser = await db.user.findUnique({
					where: { email: normalizedEmail }
				});

				if (existingUser) {
					results.push({
						email: normalizedEmail,
						status: 'exists',
						userId: existingUser.id,
						pendingInvitationId: null
					});
				} else {
					results.push({
						email: normalizedEmail,
						status: 'new_user',
						userId: null,
						pendingInvitationId: null
					});
				}
			}

			return results;
		}
	})
}));

// Input type for creating invitations
const CreateInvitationInput = builder.inputType('CreateInvitationInput', {
	fields: (t) => ({
		email: t.string(),
		role: t.field({ type: TeamRole })
	})
});

// Result type for invitation creation errors
const InvitationError = builder.simpleObject('InvitationError', {
	fields: (t) => ({
		email: t.string(),
		error: t.string()
	})
});

// Result type for created invitation (includes plaintext token for copy)
const CreatedInvitation = builder.simpleObject('CreatedInvitation', {
	fields: (t) => ({
		id: t.string(),
		email: t.string(),
		role: t.string(),
		token: t.string({ nullable: true }), // Plaintext token for new users
		expiresAt: t.field({ type: 'DateTime' }),
		addedDirectly: t.boolean() // True if user was added directly (existing user)
	})
});

// Result type for batch invitation creation
const CreateInvitationsResult = builder.simpleObject('CreateInvitationsResult', {
	fields: (t) => ({
		created: t.field({ type: [CreatedInvitation] }),
		errors: t.field({ type: [InvitationError] })
	})
});

// Mutation to create invitations
builder.mutationFields((t) => ({
	createTeamMemberInvitations: t.field({
		type: CreateInvitationsResult,
		args: {
			conferenceId: t.arg.string(),
			invitations: t.arg({ type: [CreateInvitationInput] })
		},
		resolve: async (root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Check permission
			const hasPermission = await canManageInvitations(user.sub, args.conferenceId, user);
			if (!hasPermission) {
				throw new GraphQLError('You do not have permission to manage team invitations');
			}

			// Fetch conference and inviter info for emails
			const conference = await db.conference.findUnique({
				where: { id: args.conferenceId }
			});
			if (!conference) {
				throw new GraphQLError('Conference not found');
			}

			const inviter = await db.user.findUnique({
				where: { id: user.sub }
			});
			const inviterName = inviter
				? `${inviter.given_name} ${inviter.family_name}`
				: 'Ein Teammitglied';

			const created: {
				id: string;
				email: string;
				role: string;
				token: string | null;
				expiresAt: Date;
				addedDirectly: boolean;
			}[] = [];
			const errors: { email: string; error: string }[] = [];

			for (const invitation of args.invitations) {
				const normalizedEmail = invitation.email.toLowerCase().trim();

				try {
					// Check if already a team member
					const existingTeamMember = await db.teamMember.findFirst({
						where: {
							conferenceId: args.conferenceId,
							user: { email: normalizedEmail }
						}
					});

					if (existingTeamMember) {
						errors.push({
							email: normalizedEmail,
							error: 'User is already a team member'
						});
						continue;
					}

					// Check if there's already a pending invitation
					const existingInvitation = await db.teamMemberInvitation.findFirst({
						where: {
							conferenceId: args.conferenceId,
							email: normalizedEmail,
							usedAt: null,
							revokedAt: null,
							expiresAt: { gt: new Date() }
						}
					});

					if (existingInvitation) {
						errors.push({
							email: normalizedEmail,
							error: 'Pending invitation already exists'
						});
						continue;
					}

					// Check if user exists
					const existingUser = await db.user.findUnique({
						where: { email: normalizedEmail }
					});

					if (existingUser) {
						// Add user directly to team
						const teamMember = await db.teamMember.create({
							data: {
								conferenceId: args.conferenceId,
								userId: existingUser.id,
								role: invitation.role
							}
						});

						// Create a "used" invitation record for tracking
						const token = makeInvitationToken();
						await db.teamMemberInvitation.create({
							data: {
								email: normalizedEmail,
								role: invitation.role,
								token: hashToken(token),
								expiresAt: new Date(), // Already expired
								usedAt: new Date(),
								conferenceId: args.conferenceId,
								invitedById: user.sub,
								acceptedById: existingUser.id
							}
						});

						created.push({
							id: teamMember.id,
							email: normalizedEmail,
							role: invitation.role,
							token: null, // No token needed for existing users
							expiresAt: new Date(),
							addedDirectly: true
						});

						// Send welcome email to existing user
						const dashboardUrl = `${ctx.url.origin}/dashboard/${args.conferenceId}`;
						sendTeamWelcomeEmail({
							recipientName: `${existingUser.given_name} ${existingUser.family_name}`,
							recipientEmail: normalizedEmail,
							conferenceTitle: conference.title,
							roleName: translateTeamRole(invitation.role),
							inviterName,
							dashboardUrl
						}).catch((err) => console.error('Failed to send welcome email:', err));
					} else {
						// Create invitation for new user
						const token = makeInvitationToken();
						const expiresAt = getInvitationExpiryDate();

						const invitationRecord = await db.teamMemberInvitation.create({
							data: {
								email: normalizedEmail,
								role: invitation.role,
								token: hashToken(token),
								expiresAt,
								conferenceId: args.conferenceId,
								invitedById: user.sub
							}
						});

						created.push({
							id: invitationRecord.id,
							email: normalizedEmail,
							role: invitation.role,
							token, // Return plaintext token for copy-to-clipboard
							expiresAt,
							addedDirectly: false
						});

						// Send invitation email with magic link
						const inviteUrl = `${ctx.url.origin}/auth/accept-invitation?token=${token}`;
						sendTeamInvitationEmail({
							recipientEmail: normalizedEmail,
							conferenceTitle: conference.title,
							roleName: translateTeamRole(invitation.role),
							inviterName,
							inviteUrl,
							expiresAt
						}).catch((err) => console.error('Failed to send invitation email:', err));
					}
				} catch (error) {
					errors.push({
						email: normalizedEmail,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			}

			return { created, errors };
		}
	})
}));

// Result type for revoke mutation
const RevokeInvitationResult = builder.simpleObject('RevokeInvitationResult', {
	fields: (t) => ({
		success: t.boolean(),
		message: t.string({ nullable: true })
	})
});

// Mutation to revoke an invitation
builder.mutationFields((t) => ({
	revokeTeamMemberInvitation: t.field({
		type: RevokeInvitationResult,
		args: {
			invitationId: t.arg.string()
		},
		resolve: async (root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Get the invitation
			const invitation = await db.teamMemberInvitation.findUnique({
				where: { id: args.invitationId }
			});

			if (!invitation) {
				throw new GraphQLError('Invitation not found');
			}

			// Check permission
			const hasPermission = await canManageInvitations(user.sub, invitation.conferenceId, user);
			if (!hasPermission) {
				throw new GraphQLError('You do not have permission to manage team invitations');
			}

			// Check if already revoked or used
			if (invitation.revokedAt) {
				return { success: false, message: 'Invitation is already revoked' };
			}

			if (invitation.usedAt) {
				return { success: false, message: 'Invitation has already been used' };
			}

			// Revoke the invitation
			await db.teamMemberInvitation.update({
				where: { id: args.invitationId },
				data: { revokedAt: new Date() }
			});

			return { success: true, message: null };
		}
	})
}));

// Result type for regenerate mutation
const RegenerateInvitationResult = builder.simpleObject('RegenerateInvitationResult', {
	fields: (t) => ({
		success: t.boolean(),
		newToken: t.string({ nullable: true }),
		newExpiresAt: t.field({ type: 'DateTime', nullable: true }),
		message: t.string({ nullable: true })
	})
});

// Mutation to regenerate an invitation token
builder.mutationFields((t) => ({
	regenerateTeamMemberInvitation: t.field({
		type: RegenerateInvitationResult,
		args: {
			invitationId: t.arg.string(),
			sendEmail: t.arg.boolean({ defaultValue: false })
		},
		resolve: async (root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Get the invitation
			const invitation = await db.teamMemberInvitation.findUnique({
				where: { id: args.invitationId }
			});

			if (!invitation) {
				throw new GraphQLError('Invitation not found');
			}

			// Check permission
			const hasPermission = await canManageInvitations(user.sub, invitation.conferenceId, user);
			if (!hasPermission) {
				throw new GraphQLError('You do not have permission to manage team invitations');
			}

			// Check if already used
			if (invitation.usedAt) {
				return {
					success: false,
					newToken: null,
					newExpiresAt: null,
					message: 'Invitation has already been used'
				};
			}

			// Generate new token and expiry
			const newToken = makeInvitationToken();
			const newExpiresAt = getInvitationExpiryDate();

			// Update the invitation (also clears revoked status)
			await db.teamMemberInvitation.update({
				where: { id: args.invitationId },
				data: {
					token: hashToken(newToken),
					expiresAt: newExpiresAt,
					revokedAt: null
				}
			});

			if (args.sendEmail) {
				// Fetch conference and inviter info for email
				const conference = await db.conference.findUnique({
					where: { id: invitation.conferenceId }
				});
				const inviter = await db.user.findUnique({
					where: { id: user.sub }
				});
				const inviterName = inviter
					? `${inviter.given_name} ${inviter.family_name}`
					: 'Ein Teammitglied';

				if (conference) {
					const inviteUrl = `${ctx.url.origin}/auth/accept-invitation?token=${newToken}`;
					sendTeamInvitationEmail({
						recipientEmail: invitation.email,
						conferenceTitle: conference.title,
						roleName: translateTeamRole(invitation.role),
						inviterName,
						inviteUrl,
						expiresAt: newExpiresAt
					}).catch((err) => console.error('Failed to send invitation email:', err));
				}
			}

			return {
				success: true,
				newToken,
				newExpiresAt,
				message: null
			};
		}
	})
}));

// Helper function to check if user can manage invitations
async function canManageInvitations(
	userId: string,
	conferenceId: string,
	oidcUser: { hasRole: (role: 'admin' | 'member' | 'service_user') => boolean }
): Promise<boolean> {
	// Admins can always manage
	if (oidcUser.hasRole('admin')) {
		return true;
	}

	// Check team membership with appropriate role
	const teamMember = await db.teamMember.findFirst({
		where: {
			conferenceId,
			userId,
			role: { in: ['PROJECT_MANAGEMENT', 'TEAM_COORDINATOR'] }
		}
	});

	return !!teamMember;
}
