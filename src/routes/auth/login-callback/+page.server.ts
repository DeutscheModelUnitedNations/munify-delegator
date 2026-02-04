import type { TokenCookieSchemaType } from '$api/context/oidc';
import {
	codeVerifierCookieName,
	oidcStateCookieName,
	resolveSignin,
	tokensCookieName
} from '$api/services/OIDC';
import { graphql } from '$houdini';
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { db } from '$db/db';
import {
	hashToken,
	isTokenExpired,
	pendingInvitationCookieName
} from '$api/services/invitationToken';

const upsertMutation = graphql(`
	mutation UpserSelf {
		upsertSelf {
			userNeedsAdditionalInfo
			userId
		}
	}
`);

//TODO best would be to put all this logic in an elysia handler
export const load: PageServerLoad = async (event) => {
	const verifier = event.cookies.get(codeVerifierCookieName);
	if (!verifier) error(400, 'No code verifier cookie found.');
	const oidcState = event.cookies.get(oidcStateCookieName);
	if (!oidcState) error(400, 'No oidc state cookie found.');

	const { state, tokens } = await resolveSignin(event.url, verifier, oidcState);

	// we want to ensure throughout the app we match the TokenCookieSchemaType
	const cookieValue: TokenCookieSchemaType = {
		access_token: tokens.access_token,
		expires_in: tokens.expires_in,
		id_token: tokens.id_token,
		refresh_token: tokens.refresh_token,
		scope: tokens.scope,
		session_state: tokens.session_state,
		token_type: tokens.token_type
	};

	event.cookies.set(tokensCookieName, JSON.stringify(cookieValue), {
		//TODO investigate if we can use 'strict' here somehow
		// we need lax to allow the token to be sent with redirect from the auth provider
		sameSite: 'lax',
		path: '/',
		maxAge: tokens.expires_in ? tokens.expires_in * 1000 : undefined,
		secure: true,
		httpOnly: true
	});

	event.cookies.delete(codeVerifierCookieName, { path: '/' });
	event.cookies.delete(oidcStateCookieName, { path: '/' });

	const { data } = await upsertMutation.mutate(null, { event });

	// Process pending invitation if exists
	const pendingInvitationToken = event.cookies.get(pendingInvitationCookieName);
	if (pendingInvitationToken && data?.upsertSelf?.userId) {
		try {
			await processPendingInvitation(pendingInvitationToken, data.upsertSelf.userId);
		} catch (e) {
			console.error('Failed to process pending invitation:', e);
			// Don't block login flow if invitation processing fails
		}
		// Always delete the cookie after attempting to process
		event.cookies.delete(pendingInvitationCookieName, { path: '/' });
	}

	if (data?.upsertSelf?.userNeedsAdditionalInfo) {
		redirect(302, `/my-account?redirect=${encodeURIComponent(state.visitedUrl)}`);
	} else {
		redirect(302, state.visitedUrl);
	}
};

async function processPendingInvitation(token: string, userId: string): Promise<void> {
	const hashedToken = hashToken(token);

	// Find and validate the invitation
	const invitation = await db.teamMemberInvitation.findUnique({
		where: { token: hashedToken }
	});

	if (!invitation) {
		throw new Error('Invitation not found');
	}

	if (invitation.revokedAt || invitation.usedAt || isTokenExpired(invitation.expiresAt)) {
		throw new Error('Invitation is no longer valid');
	}

	// Check if user is already a team member
	const existingMember = await db.teamMember.findUnique({
		where: {
			conferenceId_userId: {
				conferenceId: invitation.conferenceId,
				userId
			}
		}
	});

	if (existingMember) {
		// User is already a member, just mark invitation as used
		await db.teamMemberInvitation.update({
			where: { id: invitation.id },
			data: {
				usedAt: new Date(),
				acceptedById: userId
			}
		});
		return;
	}

	// Add user to team and mark invitation as used in a transaction
	await db.$transaction([
		db.teamMember.create({
			data: {
				conferenceId: invitation.conferenceId,
				userId,
				role: invitation.role
			}
		}),
		db.teamMemberInvitation.update({
			where: { id: invitation.id },
			data: {
				usedAt: new Date(),
				acceptedById: userId
			}
		})
	]);
}
