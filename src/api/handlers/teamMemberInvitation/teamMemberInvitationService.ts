import { db, schema } from '#api/db/db';
import { isInvitedAddress } from './invitationValidity';
import { teamMemberInvitationPubsub, teamMemberPubsub } from '#api/pubsub';
import type { TeamRole } from '#api/services/authHelper/rules';
import { getInvitationExpiryDate, hashToken, makeInvitationToken } from './invitationToken';
import { sendTeamInvitationEmail } from '#api/handlers/email/teamInvitationEmail';
import { m } from '#lib/paraglide/messages';
import { getLocale } from '#lib/paraglide/runtime';
import {
	assertFindFirstExists,
	assertFirstEntryExists,
	normalizeEmailAddress
} from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { whereRows } from '#api/db/whereRows';
import { isParticipantOrTeamMember } from '#api/services/registration/participation';
import { apiError, isUniqueViolationOn } from '#api/services/errors';
import { logger } from '#lib/logger';
import { z } from 'zod';

/** An invitation as the service needs it, already authorized by the resolver. */
type Invitation = {
	id: string;
	conferenceId: string;
	email: string;
	role: TeamRole;
	revokedAt: Date | null;
	usedAt: Date | null;
};

/** How many addresses one call checks or invites. */
const MAX_ADDRESSES_AT_ONCE = 100;

/** A list of `item`s no longer than one call handles. */
const batchOf = <T extends z.ZodType>(item: T) =>
	z.array(item).max(MAX_ADDRESSES_AT_ONCE, {
		error: () => m.invitationTooManyAddresses({ max: MAX_ADDRESSES_AT_ONCE })
	});

/** The addresses `checkTeamInvitationEmails` looks at. */
export const invitationEmailsSchema = batchOf(z.string());

/** The invitations `createTeamMemberInvitations` sends; each address is checked on its own. */
export const invitationsSchema = batchOf(
	z.object({ email: z.string(), role: z.enum(schema.teamRole.enumValues) })
);

/** What `checkInvitationEmails` says will happen to an address. */
export const INVITATION_EMAIL_STATUSES = [
	'ALREADY_MEMBER',
	'PENDING_INVITATION',
	'EXISTS',
	'NEW_USER'
] as const;
type InvitationEmailStatus = (typeof INVITATION_EMAIL_STATUSES)[number];

/**
 * An invited address as it is stored and looked up: checked and lowercased like the `EmailAddress`
 * scalar. Throws INVALID_INPUT for something that is no address.
 */
function normalizeInvitationEmail(email: string) {
	try {
		return normalizeEmailAddress(email.trim());
	} catch {
		throw apiError({ code: 'INVALID_INPUT', message: m.invitationInvalidEmail() });
	}
}

/** The inviter's name as the invitation mail shows it. */
async function inviterDisplayName(callerId: string) {
	const inviter = await db.query.user.findFirst({
		where: { id: callerId },
		columns: { givenName: true, familyName: true }
	});
	return inviter ? `${inviter.givenName} ${inviter.familyName}` : undefined;
}

/** What an invitation mail is sent in: the conference, who invites, and where the links point. */
type InvitationContext = {
	callerId: string;
	origin: string;
	conferenceId: string;
	conferenceTitle: string;
	inviterName: string | undefined;
};

/** Mails an invitation's link. Sending happens in the background, best-effort. */
function mailInvitation({
	context,
	invitation,
	token,
	expiresAt
}: {
	context: InvitationContext;
	invitation: { id: string; email: string; role: TeamRole };
	token: string;
	expiresAt: Date;
}) {
	sendTeamInvitationEmail({
		conferenceId: context.conferenceId,
		invitationId: invitation.id,
		sentById: context.callerId,
		recipientEmail: invitation.email,
		conferenceTitle: context.conferenceTitle,
		role: invitation.role,
		inviterName: context.inviterName,
		inviteUrl: `${context.origin}/auth/accept-invitation?token=${token}`,
		expiresAt,
		locale: getLocale()
	}).catch((err: unknown) => logger.error('Failed to send invitation email', err));
}

/** The context of mails sent for the conference's invitations by `callerId`. */
async function invitationContext({
	callerId,
	origin,
	conferenceId
}: {
	callerId: string;
	origin: string;
	conferenceId: string;
}): Promise<InvitationContext> {
	const conference = await db.query.conference
		.findFirst({ where: { id: conferenceId }, columns: { title: true } })
		.then(assertFindFirstExists);
	return {
		callerId,
		origin,
		conferenceId,
		conferenceTitle: conference.title,
		inviterName: await inviterDisplayName(callerId)
	};
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
		},
		columns: { id: true }
	});
}

/** Turns the unique index on open invitations, in a race the checks lost, into its error. */
async function refusingSecondPending<T>(write: Promise<T>) {
	try {
		return await write;
	} catch (error) {
		if (isUniqueViolationOn({ error, column: 'email_pending' })) {
			throw apiError({ code: 'CONFLICT', message: m.invitationAlreadyPending() });
		}
		throw error;
	}
}

type CreatedInvitation = {
	id: string;
	email: string;
	role: TeamRole;
	token: string | null;
	expiresAt: Date;
	addedDirectly: boolean;
};

/** Why an address cannot be invited, or the account it already has. */
async function invitationRefusal({ conferenceId, email }: { conferenceId: string; email: string }) {
	const existingTeamMember = await db.query.teamMember.findFirst({
		where: { conferenceId, user: { email } },
		columns: { id: true }
	});
	if (existingTeamMember) return { refusal: m.invitationAlreadyTeamMember() };

	if (await findPendingInvitation({ conferenceId, email })) {
		return { refusal: m.invitationAlreadyPending() };
	}

	const existingUser = await db.query.user.findFirst({ where: { email }, columns: { id: true } });
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
	const { teamMemberId, invitationId } = await db.transaction(async (tx) => {
		const member = await tx
			.insert(schema.teamMember)
			.values({ conferenceId, userId: user.id, role })
			.returning({ id: schema.teamMember.id })
			.then(assertFirstEntryExists);
		const invitation = await tx
			.insert(schema.teamMemberInvitation)
			.values({
				email,
				role,
				token: hashToken(makeInvitationToken()),
				expiresAt: now,
				usedAt: now,
				conferenceId,
				invitedById: callerId,
				acceptedById: user.id
			})
			.returning({ id: schema.teamMemberInvitation.id })
			.then(assertFirstEntryExists);
		return { teamMemberId: member.id, invitationId: invitation.id };
	});
	teamMemberPubsub.created();
	teamMemberPubsub.updated(teamMemberId);
	teamMemberInvitationPubsub.created();

	return { id: invitationId, email, role, token: null, expiresAt: now, addedDirectly: true };
}

/** Unknown user: store only the hash, mail the link and hand the plaintext token back. */
async function inviteUnknownUser({
	context,
	email,
	role
}: {
	context: InvitationContext;
	email: string;
	role: TeamRole;
}): Promise<CreatedInvitation> {
	const token = makeInvitationToken();
	const expiresAt = getInvitationExpiryDate();
	const record = await refusingSecondPending(
		db
			.insert(schema.teamMemberInvitation)
			.values({
				email,
				role,
				token: hashToken(token),
				expiresAt,
				conferenceId: context.conferenceId,
				invitedById: context.callerId
			})
			.returning({ id: schema.teamMemberInvitation.id })
			.then(assertFirstEntryExists)
	);
	teamMemberInvitationPubsub.created();

	mailInvitation({ context, invitation: { id: record.id, email, role }, token, expiresAt });

	return { id: record.id, email, role, token, expiresAt, addedDirectly: false };
}

/** The message an address's failure is reported with: an API error's own, anything else logged. */
function failureMessage(error: unknown) {
	if (error instanceof GraphQLError) return error.message;
	logger.error('Inviting an address failed', error);
	return m.unknownError();
}

/**
 * Invites several people at once: a known account joins the team right away, anybody else gets a
 * mailed link. Each address is handled independently: one failure is reported in `errors` and the
 * rest still go through.
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
	const context = await invitationContext({ callerId, origin, conferenceId });
	const created: CreatedInvitation[] = [];
	const errors: { email: string; error: string }[] = [];

	for (const invitation of invitations) {
		try {
			const email = normalizeInvitationEmail(invitation.email);
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
			errors.push({ email: invitation.email.trim(), error: failureMessage(error) });
		}
	}

	return { created, errors };
}

/** Marks an invitation revoked. Refuses (CONFLICT) one already revoked or used. */
export async function revokeInvitation(invitation: Invitation) {
	if (invitation.revokedAt) {
		throw apiError({ code: 'CONFLICT', message: m.invitationAlreadyRevoked() });
	}
	if (invitation.usedAt) {
		throw apiError({ code: 'CONFLICT', message: m.invitationAlreadyUsed() });
	}

	await db
		.update(schema.teamMemberInvitation)
		.set({ revokedAt: new Date() })
		.where(
			whereRows({
				table: schema.teamMemberInvitation,
				filter: { id: invitation.id, usedAt: { isNull: true } }
			})
		);
	teamMemberInvitationPubsub.updated(invitation.id);
}

/**
 * Issues a fresh token for an invitation with a new expiry, which also undoes a revocation, and
 * mails the new link when `sendEmail` is set. Refuses (CONFLICT) one already used, or a revoked one
 * whose address has been invited again since. Returns the plaintext token and the new expiry.
 */
export async function regenerateInvitation({
	invitation,
	callerId,
	origin,
	sendEmail
}: {
	invitation: Invitation;
	callerId: string;
	origin: string;
	sendEmail: boolean;
}) {
	if (invitation.usedAt) {
		throw apiError({ code: 'CONFLICT', message: m.invitationAlreadyUsed() });
	}

	const token = makeInvitationToken();
	const expiresAt = getInvitationExpiryDate();
	await refusingSecondPending(
		db
			.update(schema.teamMemberInvitation)
			.set({ token: hashToken(token), expiresAt, revokedAt: null })
			.where(
				whereRows({
					table: schema.teamMemberInvitation,
					filter: { id: invitation.id, usedAt: { isNull: true } }
				})
			)
	);
	teamMemberInvitationPubsub.updated(invitation.id);

	if (sendEmail) {
		const context = await invitationContext({
			callerId,
			origin,
			conferenceId: invitation.conferenceId
		});
		mailInvitation({ context, invitation, token, expiresAt });
	}

	return { token, expiresAt };
}

/**
 * What will happen to each address before anything is sent: already on the team, already
 * invited, a known account that would be added directly, or a new one. An address that is no
 * address is reported as new: inviting it reports the error.
 */
export async function checkInvitationEmails({
	conferenceId,
	emails
}: {
	conferenceId: string;
	emails: string[];
}) {
	const results: { email: string; status: InvitationEmailStatus }[] = [];
	for (const raw of emails) {
		const email = raw.trim().toLowerCase();
		results.push({ email, status: await invitationEmailStatus({ conferenceId, email }) });
	}
	return results;
}

async function invitationEmailStatus({
	conferenceId,
	email
}: {
	conferenceId: string;
	email: string;
}): Promise<InvitationEmailStatus> {
	const teamMember = await db.query.teamMember.findFirst({
		where: { conferenceId, user: { email } },
		columns: { id: true }
	});
	if (teamMember) return 'ALREADY_MEMBER';
	if (await findPendingInvitation({ conferenceId, email })) return 'PENDING_INVITATION';
	const existingUser = await db.query.user.findFirst({ where: { email }, columns: { id: true } });
	return existingUser ? 'EXISTS' : 'NEW_USER';
}

/** What became of an invitation someone redeemed. */
export type RedeemOutcome = 'joined' | 'notRedeemed' | 'otherEmail';

/**
 * Redeems the open invitation `token` names for `userId`, only when their account's email is the
 * invited address (`otherEmail` otherwise: a forwarded link makes nobody a member). They join its conference's team in the
 * invited role, or the invitation is just closed out when they are on it already. Someone taking
 * part in the conference cannot join its team as well; the invitation then stays open for the team
 * to see that it was not taken up. Marking it used is conditional, so one invitation is redeemed
 * once even by two concurrent requests.
 */
export async function redeemInvitation({
	token,
	userId
}: {
	token: string;
	userId: string;
}): Promise<RedeemOutcome> {
	const invitation = await db.query.teamMemberInvitation.findFirst({
		where: { token: hashToken(token) },
		columns: { id: true, conferenceId: true, role: true, email: true }
	});
	if (!invitation) return 'notRedeemed';

	// The link is only the invited person's: a forwarded or leaked one makes nobody else a member.
	const account = await db.query.user.findFirst({
		where: { id: userId },
		columns: { email: true }
	});
	if (!account || !isInvitedAddress({ invited: invitation.email, account: account.email })) {
		logger.warn('Invitation not redeemed: signed in with another address', {
			invitationId: invitation.id,
			userId
		});
		return 'otherEmail';
	}

	const existingMember = await db.query.teamMember.findFirst({
		where: { conferenceId: invitation.conferenceId, userId },
		columns: { id: true }
	});
	if (
		!existingMember &&
		(await isParticipantOrTeamMember({ conferenceId: invitation.conferenceId, userId }))
	) {
		logger.warn('Invitation not redeemed: the user already takes part', {
			invitationId: invitation.id,
			userId
		});
		return 'notRedeemed';
	}

	const now = new Date();
	const joined = await db.transaction(async (tx) => {
		const [claimed] = await tx
			.update(schema.teamMemberInvitation)
			.set({ usedAt: now, acceptedById: userId })
			.where(
				whereRows({
					table: schema.teamMemberInvitation,
					filter: {
						id: invitation.id,
						usedAt: { isNull: true },
						revokedAt: { isNull: true },
						expiresAt: { gt: now }
					}
				})
			)
			.returning({ id: schema.teamMemberInvitation.id });
		if (!claimed) return { claimed: false };
		if (existingMember) return { claimed: true };
		const member = await tx
			.insert(schema.teamMember)
			.values({ conferenceId: invitation.conferenceId, userId, role: invitation.role })
			.returning({ id: schema.teamMember.id })
			.then(assertFirstEntryExists);
		return { claimed: true, memberId: member.id };
	});
	if (!joined.claimed) return 'notRedeemed';

	teamMemberInvitationPubsub.updated(invitation.id);
	if (joined.memberId) {
		teamMemberPubsub.created();
		teamMemberPubsub.updated(joined.memberId);
	}
	return 'joined';
}
