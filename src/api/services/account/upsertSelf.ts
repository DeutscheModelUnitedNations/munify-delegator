import { redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { whereRows } from '#api/db/whereRows';
import { normalizeEmailAddress, normalizePersonName } from '@m1212e/rumble';
import { db, schema } from '#api/db/db';
import { teamMemberInvitationPubsub, teamMemberPubsub, userPubsub } from '#api/pubsub';
import { PUBLIC_DEFAULT_LOCALE } from '$app/env/public';
import { userFormSchema } from '../../../routes/(authenticated)/my-account/form-schema';
import { isUniqueViolationOn } from '#api/services/errors';
import { isParticipantOrTeamMember } from '#api/services/registration/participation';
import { reportEmailConflict } from './emailConflict';
import {
	hashToken,
	isOpenInvitation,
	pendingInvitationCookieName
} from '#api/handlers/teamMemberInvitation/invitationToken';
import { logger } from '#lib/logger';
import { scheduleEmailSweep } from '#api/handlers/email/emailSweep';

type Claims = {
	sub: string;
	email?: string;
	locale?: string;
	preferred_username?: string;
	given_name?: string;
	family_name?: string;
};

/**
 * A name claim the way the `PersonName` scalar would store it. A claim it rejects (or none at all)
 * is kept as it came: the account form then asks for a valid one before anything else.
 */
function nameFromClaim(claim: string | undefined): string {
	if (!claim) return '';
	try {
		return normalizePersonName(claim);
	} catch {
		return claim.trim();
	}
}

/** Answers an email conflict on login with the page explaining it. */
async function redirectToEmailConflict({
	userSubject,
	email
}: {
	userSubject: string;
	email: string;
}): Promise<never> {
	const conflict = await reportEmailConflict({ userSubject, email });
	redirect(302, conflict.redirectTo);
}

/**
 * Creates or refreshes the signed-in person's row from their OIDC claims.
 *
 * Called from the OIDC callback, which is the only moment the app learns about a new account. The
 * claims come from the token rather than the userinfo endpoint: when access tokens are JWTs scoped
 * to an API resource, fetching userinfo fails.
 *
 * Redirects rather than returns, because both of its unusual outcomes are navigations: a taken
 * email address has its own explanatory page, and an account that is missing details has to fill
 * them in before it can do anything (and then go on to `returnTo`, a same-site path).
 */
export async function upsertSelfFromClaims({
	claims,
	returnTo
}: {
	claims: Claims;
	returnTo: string;
}) {
	if (!claims.email) {
		throw new Error('OIDC result is missing required field: email');
	}
	// lowercased like the `EmailAddress` scalar; a provider sending an invalid address is a bug there
	const email = normalizeEmailAddress(claims.email);
	const locale = claims.locale ?? PUBLIC_DEFAULT_LOCALE;

	let user;
	try {
		[user] = await db
			.insert(schema.user)
			.values({
				id: claims.sub,
				email,
				familyName: nameFromClaim(claims.family_name),
				givenName: nameFromClaim(claims.given_name),
				preferredUsername: claims.preferred_username ?? email,
				locale
			})
			.onConflictDoUpdate({ target: schema.user.id, set: { email, locale } })
			.returning();
	} catch (error) {
		if (!isUniqueViolationOn({ error, column: 'email' })) throw error;
		return redirectToEmailConflict({ userSubject: claims.sub, email });
	}
	// a new account is in no list yet, so announcing its row is enough
	userPubsub.updated(user.id);

	await claimPendingInvitation(user.id);

	const needsMoreInfo = !userFormSchema.safeParse({
		...user,
		given_name: user.givenName,
		family_name: user.familyName
	}).success;

	if (needsMoreInfo) {
		redirect(302, `/my-account?redirect=${encodeURIComponent(returnTo)}`);
	}
}

/**
 * Someone invited by email arrives with the invitation token in a cookie, set before they were
 * sent off to log in. Failing to redeem it must not block the login.
 */
export async function claimPendingInvitation(userId: string) {
	const event = getRequestEvent();
	const token = event.cookies.get(pendingInvitationCookieName);
	if (!token) return;

	try {
		const invitation = await db.query.teamMemberInvitation.findFirst({
			where: { token: hashToken(token) }
		});

		if (!isOpenInvitation(invitation)) return;

		const usedNow = { usedAt: new Date(), acceptedById: userId };
		const invitationRow = whereRows({
			table: schema.teamMemberInvitation,
			filter: { id: invitation.id }
		});
		const existingMember = await db.query.teamMember.findFirst({
			where: { conferenceId: invitation.conferenceId, userId }
		});

		if (existingMember) {
			// Already a member, so the invitation just gets closed out.
			await db.update(schema.teamMemberInvitation).set(usedNow).where(invitationRow);
			teamMemberInvitationPubsub.updated(invitation.id);
			return;
		}

		// Someone taking part in the conference cannot join its team as well; the invitation stays
		// open for the team to see that it was not taken up.
		if (await isParticipantOrTeamMember({ conferenceId: invitation.conferenceId, userId })) {
			logger.warn('Invitation not redeemed: the user already takes part', {
				invitationId: invitation.id,
				userId
			});
			return;
		}

		await db.transaction(async (tx) => {
			await tx
				.insert(schema.teamMember)
				.values({ conferenceId: invitation.conferenceId, userId, role: invitation.role });
			await tx.update(schema.teamMemberInvitation).set(usedNow).where(invitationRow);
		});
		teamMemberPubsub.created();
		teamMemberInvitationPubsub.updated(invitation.id);
		scheduleEmailSweep({ conferenceId: invitation.conferenceId, origin: event.url.origin });
	} catch (error) {
		logger.error('Failed to process pending invitation', error);
	} finally {
		event.cookies.delete(pendingInvitationCookieName, { path: '/' });
	}
}
