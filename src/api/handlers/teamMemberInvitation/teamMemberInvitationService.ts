import { db, schema } from '#api/db/db';
import { teamMemberInvitationPubsub, teamMemberPubsub } from '#api/pubsub';
import type { TeamRole } from '#api/services/authHelper/rules';
import { getInvitationExpiryDate, hashToken, makeInvitationToken } from './invitationToken';
import { sendTeamInvitationEmail } from '#api/handlers/email/teamInvitationEmail';
import { m } from '#lib/paraglide/messages';
import { getLocale } from '#lib/paraglide/runtime';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { isParticipantOrTeamMember } from '#api/services/registration/participation';
import { logger } from '#lib/logger';

/** An invitation as the service needs it, already authorized by the resolver. */
type Invitation = {
	id: string;
	conferenceId: string;
	email: string;
	role: TeamRole;
	revokedAt: Date | null;
	usedAt: Date | null;
};

/** An invited address as it is stored and looked up. */
export const normalizeInvitationEmail = (email: string) => email.toLowerCase().trim();

async function inviterDisplayName(callerId: string) {
	const inviter = await db.query.user.findFirst({ where: { id: callerId } });
	return inviter ? `${inviter.givenName} ${inviter.familyName}` : undefined;
}

/** Mails a regenerated invitation's new link. Sending happens in the background, best-effort. */
async function resendInvitationEmail({
	invitation,
	callerId,
	origin,
	token,
	expiresAt
}: {
	invitation: { id: string; conferenceId: string; email: string; role: TeamRole };
	callerId: string;
	origin: string;
	token: string;
	expiresAt: Date;
}) {
	const conference = await db.query.conference.findFirst({
		where: { id: invitation.conferenceId }
	});
	if (!conference) return;

	sendTeamInvitationEmail({
		conferenceId: invitation.conferenceId,
		invitationId: invitation.id,
		sentById: callerId,
		recipientEmail: invitation.email,
		conferenceTitle: conference.title,
		role: invitation.role,
		inviterName: await inviterDisplayName(callerId),
		inviteUrl: `${origin}/auth/accept-invitation?token=${token}`,
		expiresAt,
		locale: getLocale()
	}).catch((err: unknown) => logger.error('Failed to send invitation email', err));
}

/** An invitation that is still open: not used, not revoked, not expired. */
function findPendingInvitation({ conferenceId, email }: { conferenceId: string; email: string }) {
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

type CreatedInvitation = {
	id: string;
	email: string;
	role: string;
	token: string | null;
	expiresAt: Date;
	addedDirectly: boolean;
};

/** What one invitation is sent in: the conference, who invites, and where the links point. */
type InvitationContext = {
	callerId: string;
	origin: string;
	conferenceId: string;
	conferenceTitle: string;
	inviterName: string | undefined;
};

/** Why an address cannot be invited, or undefined when it can. */
async function invitationRefusal({ conferenceId, email }: { conferenceId: string; email: string }) {
	const existingTeamMember = await db.query.teamMember.findFirst({
		where: { conferenceId, user: { email } }
	});
	if (existingTeamMember) return { refusal: m.invitationAlreadyTeamMember() };

	const pending = await findPendingInvitation({ conferenceId, email });
	if (pending) return { refusal: m.invitationAlreadyPending() };

	const existingUser = await db.query.user.findFirst({ where: { email } });
	if (
		existingUser &&
		(await isParticipantOrTeamMember({ conferenceId, userId: existingUser.id }))
	) {
		// Not a team member (checked above), so a participant: one part per conference.
		return { refusal: m.invitationAlreadyParticipant() };
	}
	return { existingUser };
}

/**
 * Known user: add straight to the team and record an already-used invitation so the audit trail
 * still shows who invited them. Both or neither: a membership without its record would hide who
 * granted it.
 */
async function addKnownUser({
	context,
	user,
	email,
	role
}: {
	context: InvitationContext;
	user: { id: string };
	email: string;
	role: TeamRole;
}): Promise<CreatedInvitation> {
	const { conferenceId, callerId } = context;
	const now = new Date();
	const teamMember = await db.transaction(async (tx) => {
		const member = await tx
			.insert(schema.teamMember)
			.values({ conferenceId, userId: user.id, role })
			.returning()
			.then(assertFirstEntryExists);

		await tx.insert(schema.teamMemberInvitation).values({
			email,
			role,
			token: hashToken(makeInvitationToken()),
			expiresAt: now,
			usedAt: now,
			conferenceId,
			invitedById: callerId,
			acceptedById: user.id
		});

		return member;
	});
	teamMemberPubsub.created();
	teamMemberInvitationPubsub.created();

	return { id: teamMember.id, email, role, token: null, expiresAt: now, addedDirectly: true };
}

/** Unknown user: store only the hash, hand the plaintext token back to the caller. */
async function inviteUnknownUser({
	context,
	email,
	role
}: {
	context: InvitationContext;
	email: string;
	role: TeamRole;
}): Promise<CreatedInvitation> {
	const { conferenceId } = context;
	const token = makeInvitationToken();
	const expiresAt = getInvitationExpiryDate();
	const record = await db
		.insert(schema.teamMemberInvitation)
		.values({
			email,
			role,
			token: hashToken(token),
			expiresAt,
			conferenceId,
			invitedById: context.callerId
		})
		.returning()
		.then(assertFirstEntryExists);
	teamMemberInvitationPubsub.created();

	sendTeamInvitationEmail({
		conferenceId,
		invitationId: record.id,
		sentById: context.callerId,
		recipientEmail: email,
		conferenceTitle: context.conferenceTitle,
		role,
		inviterName: context.inviterName,
		inviteUrl: `${context.origin}/auth/accept-invitation?token=${token}`,
		expiresAt,
		locale: getLocale()
	}).catch((err: unknown) => logger.error('Failed to send invitation email', err));

	return { id: record.id, email, role, token, expiresAt, addedDirectly: false };
}

/**
 * Invites several people at once. Each address is handled independently: one failure is
 * reported in `errors` and the rest still go through.
 */
export async function createInvitations({
	callerId,
	origin,
	conferenceId,
	invitations
}: {
	callerId: string;
	origin: string;
	conferenceId: string;
	invitations: { email: string; role: TeamRole }[];
}) {
	const conference = await db.query.conference
		.findFirst({ where: { id: conferenceId } })
		.then(assertFindFirstExists);
	const context: InvitationContext = {
		callerId,
		origin,
		conferenceId,
		conferenceTitle: conference.title,
		inviterName: await inviterDisplayName(callerId)
	};

	const created: CreatedInvitation[] = [];
	const errors: { email: string; error: string }[] = [];

	for (const invitation of invitations) {
		const email = normalizeInvitationEmail(invitation.email);
		try {
			const { refusal, existingUser } = await invitationRefusal({ conferenceId, email });
			if (refusal) {
				errors.push({ email, error: refusal });
				continue;
			}
			created.push(
				existingUser
					? await addKnownUser({ context, user: existingUser, email, role: invitation.role })
					: await inviteUnknownUser({ context, email, role: invitation.role })
			);
		} catch (error) {
			errors.push({
				email,
				error: error instanceof Error ? error.message : m.unknownError()
			});
		}
	}

	return { created, errors };
}

/** Marks an invitation revoked, unless it already was or has been used. */
export async function revokeInvitation(invitation: Invitation) {
	if (invitation.revokedAt) {
		return { success: false, message: m.invitationAlreadyRevoked() };
	}
	if (invitation.usedAt) {
		return { success: false, message: m.invitationAlreadyUsed() };
	}

	await db
		.update(schema.teamMemberInvitation)
		.set({ revokedAt: new Date() })
		.where(whereRows({ table: schema.teamMemberInvitation, filter: { id: invitation.id } }));
	teamMemberInvitationPubsub.updated(invitation.id);

	return { success: true, message: null };
}

/** Issues a fresh token for an invitation, optionally mailing it. */
export async function regenerateInvitation({
	invitation,
	callerId,
	origin,
	sendEmail
}: {
	invitation: Invitation;
	callerId: string;
	origin: string;
	sendEmail: boolean | null | undefined;
}) {
	if (invitation.usedAt) {
		return {
			success: false,
			newToken: null,
			newExpiresAt: null,
			message: m.invitationAlreadyUsed()
		};
	}

	const newToken = makeInvitationToken();
	const newExpiresAt = getInvitationExpiryDate();

	// Regenerating also un-revokes, matching the legacy resolver.
	await db
		.update(schema.teamMemberInvitation)
		.set({ token: hashToken(newToken), expiresAt: newExpiresAt, revokedAt: null })
		.where(whereRows({ table: schema.teamMemberInvitation, filter: { id: invitation.id } }));
	teamMemberInvitationPubsub.updated(invitation.id);

	if (sendEmail) {
		await resendInvitationEmail({
			invitation,
			callerId,
			origin,
			token: newToken,
			expiresAt: newExpiresAt
		});
	}

	return { success: true, newToken, newExpiresAt, message: null };
}

/**
 * What will happen to each address before anything is sent: already on the team, already
 * invited, a known user who would be added directly, or a genuinely new one.
 */
export async function checkInvitationEmails({
	conferenceId,
	emails
}: {
	conferenceId: string;
	emails: { email: string }[];
}) {
	const results: {
		email: string;
		status: string;
		userId: string | null;
		pendingInvitationId: string | null;
	}[] = [];

	for (const { email: raw } of emails) {
		const email = normalizeInvitationEmail(raw);

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

		const pending = await findPendingInvitation({ conferenceId, email });
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
