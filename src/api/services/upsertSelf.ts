import { redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { eq } from 'drizzle-orm';
import { normalizeEmailAddress, normalizePersonName } from '@m1212e/rumble';
import { db, schema } from '$api/db/db';
import { configPublic } from '$config/public';
import { userFormSchema } from '../../routes/(authenticated)/my-account/form-schema';
import { errorCause, isUniqueViolationOn } from './emailConflict';
import { reportEmailConflict } from './reportEmailConflict';
import { hashToken, isOpenInvitation, pendingInvitationCookieName } from './invitationToken';

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
async function redirectToEmailConflict(
	userSubject: string,
	email: string,
	error: unknown
): Promise<never> {
	const conflict = await reportEmailConflict(userSubject, email, error);
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
 * them in before it can do anything.
 */
export async function upsertSelfFromClaims(claims: Claims) {
	if (!claims.email) {
		throw new Error('OIDC result is missing required field: email');
	}
	// lowercased like the `EmailAddress` scalar; a provider sending an invalid address is a bug there
	const email = normalizeEmailAddress(claims.email);
	const locale = claims.locale ?? configPublic.PUBLIC_DEFAULT_LOCALE;

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
		if (!isUniqueViolationOn(errorCause(error), 'email')) throw error;
		return redirectToEmailConflict(claims.sub, email, error);
	}

	await claimPendingInvitation(user.id);

	const needsMoreInfo = !userFormSchema.safeParse({
		...user,
		given_name: user.givenName,
		family_name: user.familyName
	}).success;

	if (needsMoreInfo) {
		redirect(302, `/my-account?redirect=${encodeURIComponent(intendedDestination())}`);
	}
}

/**
 * Where the person was heading before they were sent off to log in.
 *
 * This runs inside the login callback, so the current URL is the callback route and useless as a
 * destination. The OIDC library round-trips the original URL through the `state` parameter, which
 * is still on the query string at this point, so read it from there and fall back to the start
 * page when it is missing or points somewhere else.
 */
function intendedDestination(): string {
	const event = getRequestEvent();
	const state = event.url.searchParams.get('state');
	if (!state) return '/';

	try {
		const parsed: unknown = JSON.parse(state);
		if (parsed === null || typeof parsed !== 'object' || !('visitedUrl' in parsed)) return '/';
		const visitedUrl = parsed.visitedUrl;
		if (typeof visitedUrl !== 'string') return '/';

		const target = new URL(visitedUrl, event.url.origin);
		if (target.origin !== event.url.origin) return '/';
		return `${target.pathname}${target.search}`;
	} catch {
		return '/';
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
		const invitationRow = eq(schema.teamMemberInvitation.id, invitation.id);
		const existingMember = await db.query.teamMember.findFirst({
			where: { conferenceId: invitation.conferenceId, userId }
		});

		if (existingMember) {
			// Already a member, so the invitation just gets closed out.
			await db.update(schema.teamMemberInvitation).set(usedNow).where(invitationRow);
			return;
		}

		await db.transaction(async (tx) => {
			await tx
				.insert(schema.teamMember)
				.values({ conferenceId: invitation.conferenceId, userId, role: invitation.role });
			await tx.update(schema.teamMemberInvitation).set(usedNow).where(invitationRow);
		});
	} catch (error) {
		console.error('Failed to process pending invitation:', error);
	} finally {
		event.cookies.delete(pendingInvitationCookieName, { path: '/' });
	}
}
