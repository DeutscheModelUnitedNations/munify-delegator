import { db, schema } from '$api/db/db';
import type { ApiContext } from '$api/rumble';
import { assertMayGrantRole, type TeamRole } from '$api/services/authHelper';
import {
	getInvitationExpiryDate,
	hashToken,
	makeInvitationToken
} from '$api/services/account/invitationToken';
import {
	sendTeamInvitationEmail,
	sendTeamWelcomeEmail
} from '$api/services/email/sendTeamInvitationEmail';
import { translateTeamRole } from '$lib/utils/enumTranslations';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';

/** An invitation the caller may change, or an error. */
async function updatableInvitation(ctx: ApiContext, invitationId: string) {
	return db.query.teamMemberInvitation
		.findFirst(
			(await ctx.abilities.teamMemberInvitation.filter('update')).merge({
				where: { id: invitationId }
			}).query.single
		)
		.then(assertFindFirstExists);
}

async function inviterDisplayName(callerId: string) {
	const inviter = await db.query.user.findFirst({ where: { id: callerId } });
	return inviter ? `${inviter.givenName} ${inviter.familyName}` : 'Ein Teammitglied';
}

/** Mails a regenerated invitation's new link. Sending happens in the background, best-effort. */
async function resendInvitationEmail(
	invitation: { conferenceId: string; email: string; role: TeamRole },
	callerId: string,
	origin: string,
	token: string,
	expiresAt: Date
) {
	const conference = await db.query.conference.findFirst({
		where: { id: invitation.conferenceId }
	});
	if (!conference) return;

	sendTeamInvitationEmail({
		recipientEmail: invitation.email,
		conferenceTitle: conference.title,
		roleName: translateTeamRole(invitation.role),
		inviterName: await inviterDisplayName(callerId),
		inviteUrl: `${origin}/auth/accept-invitation?token=${token}`,
		expiresAt
	}).catch((err) => console.error('Failed to send invitation email:', err));
}

/** An invitation that is still open: not used, not revoked, not expired. */
function findPendingInvitation(conferenceId: string, email: string) {
	return db.query.teamMemberInvitation.findFirst({
		where: {
			conferenceId,
			email,
			usedAt: { isNull: true },
			revokedAt: { isNull: true },
			expiresAt: { gt: new Date() }
		}
	});
}

/**
 * Invites several people at once. Each address is handled independently: one failure is
 * reported in `errors` and the rest still go through.
 */
export async function createInvitations(
	ctx: ApiContext,
	callerId: string,
	conferenceId: string,
	invitations: { email: string; role: TeamRole }[]
) {
	const conference = await db.query.conference
		.findFirst({ where: { id: conferenceId } })
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

	for (const invitation of invitations) {
		const email = invitation.email.toLowerCase().trim();
		try {
			await assertMayGrantRole(ctx, conferenceId, invitation.role);

			const existingTeamMember = await db.query.teamMember.findFirst({
				where: { conferenceId, user: { email } }
			});
			if (existingTeamMember) {
				errors.push({ email, error: 'User is already a team member' });
				continue;
			}

			const pending = await findPendingInvitation(conferenceId, email);
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
						conferenceId,
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
					conferenceId,
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
					dashboardUrl: `${ctx.url.origin}/dashboard/${conferenceId}`
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
						conferenceId,
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

/** Marks an invitation revoked, unless it already was or has been used. */
export async function revokeInvitation(ctx: ApiContext, invitationId: string) {
	const invitation = await updatableInvitation(ctx, invitationId);

	if (invitation.revokedAt) {
		return { success: false, message: 'Invitation is already revoked' };
	}
	if (invitation.usedAt) {
		return { success: false, message: 'Invitation has already been used' };
	}

	await db
		.update(schema.teamMemberInvitation)
		.set({ revokedAt: new Date() })
		.where(eq(schema.teamMemberInvitation.id, invitationId));

	return { success: true, message: null };
}

/** Issues a fresh token for an invitation, optionally mailing it. */
export async function regenerateInvitation(
	ctx: ApiContext,
	callerId: string,
	invitationId: string,
	sendEmail: boolean | null | undefined
) {
	const invitation = await updatableInvitation(ctx, invitationId);

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
		.where(eq(schema.teamMemberInvitation.id, invitationId));

	if (sendEmail) {
		await resendInvitationEmail(invitation, callerId, ctx.url.origin, newToken, newExpiresAt);
	}

	return { success: true, newToken, newExpiresAt, message: null };
}

/**
 * What will happen to each address before anything is sent: already on the team, already
 * invited, a known user who would be added directly, or a genuinely new one.
 */
export async function checkInvitationEmails(conferenceId: string, emails: { email: string }[]) {
	const results: {
		email: string;
		status: string;
		userId: string | null;
		pendingInvitationId: string | null;
	}[] = [];

	for (const { email: raw } of emails) {
		const email = raw.toLowerCase().trim();

		const teamMember = await db.query.teamMember.findFirst({
			where: { conferenceId, user: { email } }
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

		const pending = await findPendingInvitation(conferenceId, email);
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
