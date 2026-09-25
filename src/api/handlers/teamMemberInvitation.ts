import { db, schema } from '$api/db/db';
import { abilityBuilder, enum_, object, query, schemaBuilder } from '$api/rumble';
import {
	TEAM_ADMIN_ROLES,
	isSystemAdmin,
	isTeamMemberOfConference,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import {
	getInvitationExpiryDate,
	hashToken,
	makeInvitationToken
} from '$api/services/invitationToken';
import {
	sendTeamInvitationEmail,
	sendTeamWelcomeEmail
} from '$api/services/email/sendTeamInvitationEmail';
import { translateTeamRole } from '$lib/utils/enumTranslations';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { eq } from 'drizzle-orm';
import type { Context } from '$api/context';

// Ported from abilities/entities/teamMemberInvitation.ts
abilityBuilder.teamMemberInvitation.allow(['read', 'update', 'delete']).when(systemAdmin);

// Project management and team coordinators manage invitations for their conference.
abilityBuilder.teamMemberInvitation.allow(['read', 'update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, TEAM_ADMIN_ROLES);
	return where ? { where } : undefined;
});

export const TeamMemberInvitationRef = object({ table: 'teamMemberInvitation' });
query({ table: 'teamMemberInvitation' });

const teamRoleEnum = enum_({ tsName: 'teamRole' });

/**
 * Invitation management is project management or team coordinator, or a system admin. Kept as an
 * explicit check rather than an ability filter because it is asked before a row exists.
 */
async function canManageInvitations(ctx: Context, conferenceId: string) {
	if (isSystemAdmin(ctx)) return true;
	const callerId = userId(ctx);
	if (!callerId) return false;
	const teamMember = await db.query.teamMember.findFirst({
		where: { conferenceId, userId: callerId, role: { in: [...TEAM_ADMIN_ROLES] } }
	});
	return Boolean(teamMember);
}

async function assertMayManageInvitations(ctx: Context, conferenceId: string) {
	if (!(await canManageInvitations(ctx, conferenceId))) {
		throw new GraphQLError('You do not have permission to manage team invitations');
	}
}

async function inviterDisplayName(callerId: string) {
	const inviter = await db.query.user.findFirst({ where: { id: callerId } });
	return inviter ? `${inviter.givenName} ${inviter.familyName}` : 'Ein Teammitglied';
}

const CreateInvitationInput = schemaBuilder.inputType('CreateInvitationInput', {
	fields: (t) => ({
		email: t.string({ required: true }),
		role: t.field({ type: teamRoleEnum, required: true })
	})
});

const CreatedInvitation = schemaBuilder.simpleObject('CreatedInvitation', {
	fields: (t) => ({
		id: t.string(),
		email: t.string(),
		role: t.string(),
		/** Plaintext, for copy-to-clipboard. Null when the user was added directly. */
		token: t.string({ nullable: true }),
		expiresAt: t.field({ type: 'DateTime' }),
		addedDirectly: t.boolean()
	})
});

const InvitationError = schemaBuilder.simpleObject('InvitationError', {
	fields: (t) => ({ email: t.string(), error: t.string() })
});

const CreateInvitationsResult = schemaBuilder.simpleObject('CreateInvitationsResult', {
	fields: (t) => ({
		created: t.field({ type: [CreatedInvitation] }),
		errors: t.field({ type: [InvitationError] })
	})
});

const RevokeInvitationResult = schemaBuilder.simpleObject('RevokeInvitationResult', {
	fields: (t) => ({ success: t.boolean(), message: t.string({ nullable: true }) })
});

const RegenerateInvitationResult = schemaBuilder.simpleObject('RegenerateInvitationResult', {
	fields: (t) => ({
		success: t.boolean(),
		newToken: t.string({ nullable: true }),
		newExpiresAt: t.field({ type: 'DateTime', nullable: true }),
		message: t.string({ nullable: true })
	})
});

schemaBuilder.mutationFields((t) => ({
	/**
	 * Invites several people at once. Each address is handled independently: one failure is
	 * reported in `errors` and the rest still go through, which is why this returns a result
	 * object rather than throwing.
	 */
	createTeamMemberInvitations: t.field({
		type: CreateInvitationsResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			invitations: t.arg({ type: [CreateInvitationInput], required: true })
		},
		resolve: async (_root, args, ctx) => {
			const callerId = userId(ctx);
			if (!callerId) {
				throw new GraphQLError('Must be logged in');
			}
			await assertMayManageInvitations(ctx, args.conferenceId);

			const conference = await db.query.conference
				.findFirst({ where: { id: args.conferenceId } })
				.then(assertFindFirstExists);
			const inviterName = await inviterDisplayName(callerId);

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
				const email = invitation.email.toLowerCase().trim();
				try {
					const existingTeamMember = await db.query.teamMember.findFirst({
						where: { conferenceId: args.conferenceId, user: { email } }
					});
					if (existingTeamMember) {
						errors.push({ email, error: 'User is already a team member' });
						continue;
					}

					const pending = await db.query.teamMemberInvitation.findFirst({
						where: {
							conferenceId: args.conferenceId,
							email,
							usedAt: { isNull: true },
							revokedAt: { isNull: true },
							expiresAt: { gt: new Date() }
						}
					});
					if (pending) {
						errors.push({ email, error: 'Pending invitation already exists' });
						continue;
					}

					const existingUser = await db.query.user.findFirst({ where: { email } });

					if (existingUser) {
						// Known user: add straight to the team and record an already-used invitation so
						// the audit trail still shows who invited them.
						const teamMember = await db
							.insert(schema.teamMember)
							.values({
								conferenceId: args.conferenceId,
								userId: existingUser.id,
								role: invitation.role
							})
							.returning()
							.then(assertFirstEntryExists);

						const now = new Date();
						await db.insert(schema.teamMemberInvitation).values({
							email,
							role: invitation.role,
							token: hashToken(makeInvitationToken()),
							expiresAt: now,
							usedAt: now,
							conferenceId: args.conferenceId,
							invitedById: callerId,
							acceptedById: existingUser.id
						});

						created.push({
							id: teamMember.id,
							email,
							role: invitation.role,
							token: null,
							expiresAt: now,
							addedDirectly: true
						});

						sendTeamWelcomeEmail({
							recipientName: `${existingUser.givenName} ${existingUser.familyName}`,
							recipientEmail: email,
							conferenceTitle: conference.title,
							roleName: translateTeamRole(invitation.role),
							inviterName,
							dashboardUrl: `${ctx.url.origin}/dashboard/${args.conferenceId}`
						}).catch((err) => console.error('Failed to send welcome email:', err));
					} else {
						// Unknown user: store only the hash, hand the plaintext token back to the caller.
						const token = makeInvitationToken();
						const expiresAt = getInvitationExpiryDate();
						const record = await db
							.insert(schema.teamMemberInvitation)
							.values({
								email,
								role: invitation.role,
								token: hashToken(token),
								expiresAt,
								conferenceId: args.conferenceId,
								invitedById: callerId
							})
							.returning()
							.then(assertFirstEntryExists);

						created.push({
							id: record.id,
							email,
							role: invitation.role,
							token,
							expiresAt,
							addedDirectly: false
						});

						sendTeamInvitationEmail({
							recipientEmail: email,
							conferenceTitle: conference.title,
							roleName: translateTeamRole(invitation.role),
							inviterName,
							inviteUrl: `${ctx.url.origin}/auth/accept-invitation?token=${token}`,
							expiresAt
						}).catch((err) => console.error('Failed to send invitation email:', err));
					}
				} catch (error) {
					errors.push({
						email,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			}

			return { created, errors };
		}
	}),

	revokeTeamMemberInvitation: t.field({
		type: RevokeInvitationResult,
		args: { invitationId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const invitation = await db.query.teamMemberInvitation
				.findFirst({ where: { id: args.invitationId } })
				.then(assertFindFirstExists);

			await assertMayManageInvitations(ctx, invitation.conferenceId);

			if (invitation.revokedAt) {
				return { success: false, message: 'Invitation is already revoked' };
			}
			if (invitation.usedAt) {
				return { success: false, message: 'Invitation has already been used' };
			}

			await db
				.update(schema.teamMemberInvitation)
				.set({ revokedAt: new Date() })
				.where(eq(schema.teamMemberInvitation.id, args.invitationId));

			return { success: true, message: null };
		}
	}),

	regenerateTeamMemberInvitation: t.field({
		type: RegenerateInvitationResult,
		args: {
			invitationId: t.arg.id({ required: true }),
			sendEmail: t.arg.boolean({ defaultValue: false })
		},
		resolve: async (_root, args, ctx) => {
			const callerId = userId(ctx);
			if (!callerId) {
				throw new GraphQLError('Must be logged in');
			}

			const invitation = await db.query.teamMemberInvitation
				.findFirst({ where: { id: args.invitationId } })
				.then(assertFindFirstExists);

			await assertMayManageInvitations(ctx, invitation.conferenceId);

			if (invitation.usedAt) {
				return {
					success: false,
					newToken: null,
					newExpiresAt: null,
					message: 'Invitation has already been used'
				};
			}

			const newToken = makeInvitationToken();
			const newExpiresAt = getInvitationExpiryDate();

			// Regenerating also un-revokes, matching the legacy resolver.
			await db
				.update(schema.teamMemberInvitation)
				.set({ token: hashToken(newToken), expiresAt: newExpiresAt, revokedAt: null })
				.where(eq(schema.teamMemberInvitation.id, args.invitationId));

			if (args.sendEmail) {
				const conference = await db.query.conference.findFirst({
					where: { id: invitation.conferenceId }
				});
				if (conference) {
					sendTeamInvitationEmail({
						recipientEmail: invitation.email,
						conferenceTitle: conference.title,
						roleName: translateTeamRole(invitation.role),
						inviterName: await inviterDisplayName(callerId),
						inviteUrl: `${ctx.url.origin}/auth/accept-invitation?token=${newToken}`,
						expiresAt: newExpiresAt
					}).catch((err) => console.error('Failed to send invitation email:', err));
				}
			}

			return { success: true, newToken, newExpiresAt, message: null };
		}
	})
}));

const CheckEmailInput = schemaBuilder.inputType('CheckEmailInput', {
	fields: (t) => ({ email: t.string({ required: true }) })
});

const EmailStatusResult = schemaBuilder.simpleObject('EmailStatusResult', {
	fields: (t) => ({
		email: t.string(),
		/** One of: already_member, pending_invitation, exists, new_user. */
		status: t.string(),
		userId: t.string({ nullable: true }),
		pendingInvitationId: t.string({ nullable: true })
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * Tells the invite form what will happen to each address before anything is sent: already on
	 * the team, already invited, a known user who would be added directly, or a genuinely new one.
	 */
	checkTeamInvitationEmails: t.field({
		type: [EmailStatusResult],
		args: {
			conferenceId: t.arg.id({ required: true }),
			emails: t.arg({ type: [CheckEmailInput], required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertMayManageInvitations(ctx, args.conferenceId);

			const results: {
				email: string;
				status: string;
				userId: string | null;
				pendingInvitationId: string | null;
			}[] = [];

			for (const { email: raw } of args.emails) {
				const email = raw.toLowerCase().trim();

				const teamMember = await db.query.teamMember.findFirst({
					where: { conferenceId: args.conferenceId, user: { email } }
				});
				if (teamMember) {
					results.push({
						email,
						status: 'already_member',
						userId: teamMember.userId,
						pendingInvitationId: null
					});
					continue;
				}

				const pending = await db.query.teamMemberInvitation.findFirst({
					where: {
						conferenceId: args.conferenceId,
						email,
						usedAt: { isNull: true },
						revokedAt: { isNull: true },
						expiresAt: { gt: new Date() }
					}
				});
				if (pending) {
					results.push({
						email,
						status: 'pending_invitation',
						userId: null,
						pendingInvitationId: pending.id
					});
					continue;
				}

				const existingUser = await db.query.user.findFirst({ where: { email } });
				results.push({
					email,
					status: existingUser ? 'exists' : 'new_user',
					userId: existingUser?.id ?? null,
					pendingInvitationId: null
				});
			}

			return results;
		}
	})
}));
