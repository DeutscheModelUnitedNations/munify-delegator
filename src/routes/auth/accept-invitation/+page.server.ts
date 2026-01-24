import { db } from '$db/db';
import {
	hashToken,
	isTokenExpired,
	pendingInvitationCookieName
} from '$api/services/invitationToken';
import { startSignin, codeVerifierCookieName, oidcStateCookieName } from '$api/services/OIDC';
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const token = event.url.searchParams.get('token');

	if (!token) {
		error(400, 'Missing invitation token');
	}

	// Hash the token to look up in database
	const hashedToken = hashToken(token);

	// Find the invitation
	const invitation = await db.teamMemberInvitation.findUnique({
		where: { token: hashedToken },
		include: { conference: true }
	});

	if (!invitation) {
		error(404, 'Invitation not found or invalid');
	}

	if (invitation.revokedAt) {
		error(410, 'This invitation has been revoked');
	}

	if (invitation.usedAt) {
		error(410, 'This invitation has already been used');
	}

	if (isTokenExpired(invitation.expiresAt)) {
		error(410, 'This invitation has expired');
	}

	// Store the plaintext token in httpOnly cookie for processing after login
	event.cookies.set(pendingInvitationCookieName, token, {
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 60, // 1 hour - should be enough for auth flow
		secure: true,
		httpOnly: true
	});

	// Start OIDC login flow with the conference dashboard as target URL
	const targetUrl = new URL(`/dashboard/${invitation.conferenceId}`, event.url.origin);
	const { encrypted_verifier, redirect_uri, encrypted_state } = await startSignin(targetUrl);

	event.cookies.set(codeVerifierCookieName, encrypted_verifier, {
		sameSite: 'lax',
		path: '/',
		secure: true,
		httpOnly: true
	});

	event.cookies.set(oidcStateCookieName, encrypted_state, {
		sameSite: 'lax',
		path: '/',
		secure: true,
		httpOnly: true
	});

	redirect(302, redirect_uri.toString());
};
