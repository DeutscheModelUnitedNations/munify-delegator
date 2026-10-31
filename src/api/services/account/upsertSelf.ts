import { redirect } from '@sveltejs/kit';
import { normalizeEmailAddress, normalizePersonName } from '@m1212e/rumble';
import { db, schema } from '#api/db/db';
import { userPubsub } from '#api/pubsub';
import { PUBLIC_DEFAULT_LOCALE } from '$app/env/public';
import { userFormSchema } from '../../../routes/(authenticated)/my-account/form-schema';
import { isUniqueViolationOn } from '#api/services/errors';
import { reportEmailConflict } from './emailConflict';
import { claimPendingInvitation } from '#api/handlers/teamMemberInvitation/pendingInvitation';

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
