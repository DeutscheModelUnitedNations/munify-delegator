import { db } from '$api/db/db';
import { hashToken, pendingInvitationCookieName } from '$api/services/invitationToken';
import { claimPendingInvitation } from '$api/services/upsertSelf';
import type { PageServerLoad } from './$types';
import { assertInvitationUsable } from './invitationValidity';
import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';

/**
 * Turns an emailed invitation link into a conference membership.
 *
 * This has to be a server load: it reads a secret out of the query string, checks it against the
 * database and hands the browser a cookie, none of which a component can do. The login itself is
 * left to the OIDC handle — redirecting to the (protected) conference dashboard is what starts it,
 * and `userLoggedInSuccessfully` redeems the cookie once the person is back. Someone who is
 * already signed in never passes through that callback, so they are redeemed here instead.
 */
export const load: PageServerLoad = async (event) => {
	const token = event.url.searchParams.get('token');

	if (!token) {
		error(400, 'Missing invitation token');
	}

	// Hash the token to look up in database
	const hashedToken = hashToken(token);

	// Find the invitation
	const invitation = await db.query.teamMemberInvitation.findFirst({
		where: { token: hashedToken }
	});

	assertInvitationUsable(invitation);

	// Store the plaintext token in httpOnly cookie for processing after login
	event.cookies.set(pendingInvitationCookieName, token, {
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 60, // 1 hour - should be enough for auth flow
		secure: !dev,
		httpOnly: true
	});

	const alreadySignedIn = event.locals.oidc?.user;
	if (alreadySignedIn) {
		await claimPendingInvitation(alreadySignedIn.sub);
	}

	redirect(302, `/dashboard/${invitation.conferenceId}`);
};
