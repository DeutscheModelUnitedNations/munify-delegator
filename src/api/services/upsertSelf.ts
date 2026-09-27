import * as Sentry from '@sentry/sveltekit';
import { redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '$api/db/db';
import { configPublic } from '$config/public';
import { userFormSchema } from '../../routes/(authenticated)/my-account/form-schema';
import { hashToken, isTokenExpired, pendingInvitationCookieName } from './invitationToken';

/** Postgres reports a unique violation as 23505; the column shows up in the constraint name. */
function isUniqueViolationOn(error: unknown, column: string) {
	const cause = error instanceof Error && 'cause' in error ? error.cause : error;
	if (!cause || typeof cause !== 'object') return false;
	const code = 'code' in cause ? cause.code : undefined;
	const constraint = 'constraint' in cause ? String(cause.constraint ?? '') : '';
	const detail = 'detail' in cause ? String(cause.detail ?? '') : '';
	return code === '23505' && (constraint.includes(column) || detail.includes(column));
}

function maskEmail(email: string): string {
	const [localPart, domain] = email.split('@');
	if (!domain) return '***';
	if (localPart.length <= 2) return `${localPart[0] ?? ''}***@${domain}`;
	return `${localPart.slice(0, 2)}***@${domain}`;
}

type Claims = {
	sub: string;
	email?: string;
	locale?: string;
	preferred_username?: string;
	given_name?: string;
	family_name?: string;
};

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
	const email = claims.email;
	const locale = claims.locale ?? configPublic.PUBLIC_DEFAULT_LOCALE;

	let user;
	try {
		[user] = await db
			.insert(schema.user)
			.values({
				id: claims.sub,
				email,
				familyName: claims.family_name ?? '',
				givenName: claims.given_name ?? '',
				preferredUsername: claims.preferred_username ?? email,
				locale
			})
			.onConflictDoUpdate({ target: schema.user.id, set: { email, locale } })
			.returning();
	} catch (error) {
		if (!isUniqueViolationOn(error, 'email')) throw error;

		// Someone else already holds this address. Two ways to get here: a brand new account whose
		// address is taken, or an existing account changing to a taken one. The frontend shows a
		// different page for each, so say which it is.
		const existing = await db.query.user.findFirst({
			where: { id: claims.sub },
			columns: { email: true }
		});

		const isNewUser = existing === undefined;
		const maskedConflictingEmail = maskEmail(email);
		const maskedExistingEmail = existing?.email ? maskEmail(existing.email) : undefined;
		const refId = claims.sub.slice(-8);

		console.error(`[EMAIL_CONFLICT] ${isNewUser ? 'New user' : 'Email change'} conflict:`, {
			userSubject: claims.sub,
			conflictingEmail: maskedConflictingEmail,
			existingUserEmail: maskedExistingEmail ?? 'N/A',
			refId,
			timestamp: new Date().toISOString()
		});

		Sentry.captureException(error, {
			level: 'warning',
			tags: {
				error_type: 'email_conflict',
				scenario: isNewUser ? 'new_user' : 'email_change'
			},
			extra: {
				userSubject: claims.sub,
				conflictingEmail: maskedConflictingEmail,
				existingUserEmail: maskedExistingEmail ?? 'N/A',
				refId
			}
		});

		const params = new URLSearchParams({
			scenario: isNewUser ? 'new' : 'change',
			email: maskedConflictingEmail,
			ref: refId
		});
		if (maskedExistingEmail) params.set('existingEmail', maskedExistingEmail);
		redirect(302, `/auth/email-conflict?${params.toString()}`);
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

		if (
			!invitation ||
			invitation.revokedAt ||
			invitation.usedAt ||
			isTokenExpired(invitation.expiresAt)
		) {
			return;
		}

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
