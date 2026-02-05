import * as Sentry from '@sentry/sveltekit';
import type { TokenCookieSchemaType } from '$api/context/oidc';
import {
	codeVerifierCookieName,
	oidcStateCookieName,
	resolveSignin,
	tokensCookieName
} from '$api/services/OIDC';
import { graphql } from '$houdini';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
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

interface EmailConflictExtensions {
	code: 'EMAIL_CONFLICT';
	isNewUser: boolean;
	maskedConflictingEmail: string;
	maskedExistingEmail?: string;
	refId: string;
}

// Validate and extract email conflict extensions with proper runtime checks
function isEmailConflictError(
	errors: readonly { extensions?: Record<string, unknown> }[] | null | undefined
): EmailConflictExtensions | null {
	if (!errors) return null;
	for (const err of errors) {
		const ext = err.extensions;
		if (
			ext &&
			ext.code === 'EMAIL_CONFLICT' &&
			typeof ext.isNewUser === 'boolean' &&
			typeof ext.maskedConflictingEmail === 'string' &&
			typeof ext.refId === 'string'
		) {
			return {
				code: 'EMAIL_CONFLICT',
				isNewUser: ext.isNewUser,
				maskedConflictingEmail: ext.maskedConflictingEmail,
				maskedExistingEmail:
					typeof ext.maskedExistingEmail === 'string' ? ext.maskedExistingEmail : undefined,
				refId: ext.refId
			};
		}
	}
	return null;
}

//TODO best would be to put all this logic in an elysia handler
export const load: PageServerLoad = async (event) => {
	// 1. Check for OIDC error parameters first
	// The OIDC provider may redirect back with an error instead of an auth code
	const oidcError = event.url.searchParams.get('error');
	if (oidcError) {
		const errorDescription = event.url.searchParams.get('error_description');

		// Report OIDC provider errors to Sentry
		Sentry.captureMessage(`OIDC provider error: ${oidcError}`, {
			level: 'warning',
			tags: {
				error_type: 'oidc_provider_error',
				oidc_error: oidcError
			},
			extra: {
				errorDescription
			}
		});

		const params = new URLSearchParams({
			type: oidcError,
			...(errorDescription && { description: errorDescription })
		});
		redirect(302, `/auth/error?${params.toString()}`);
	}

	// 2. Check for required cookies
	const verifier = event.cookies.get(codeVerifierCookieName);
	const oidcState = event.cookies.get(oidcStateCookieName);

	// If cookies are missing, the login session expired or was invalid
	// Redirect to a friendly error page instead of showing a raw 400 error
	if (!verifier || !oidcState) {
		redirect(302, '/auth/session-expired');
	}

	// 3. Try to complete the token exchange
	let state: { visitedUrl: string };
	let tokens: Awaited<ReturnType<typeof resolveSignin>>['tokens'];

	try {
		const result = await resolveSignin(event.url, verifier, oidcState);
		state = result.state;
		tokens = result.tokens;
	} catch (err) {
		console.error('[AUTH] Token exchange failed:', err);

		// Determine the error type for better user messaging
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		let errorType = 'token_exchange_failed';

		if (errorMessage.includes('state') || errorMessage.includes('State')) {
			errorType = 'state_mismatch';
		} else if (
			errorMessage.includes('network') ||
			errorMessage.includes('fetch') ||
			errorMessage.includes('ECONNREFUSED')
		) {
			errorType = 'network_error';
		}

		// Report token exchange failures to Sentry
		Sentry.captureException(err, {
			level: 'error',
			tags: {
				error_type: errorType
			},
			extra: {
				errorMessage
			}
		});

		const params = new URLSearchParams({ type: errorType });
		redirect(302, `/auth/error?${params.toString()}`);
	}

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

	const { data, errors } = await upsertMutation.mutate(null, { event });

	// Check for email conflict error
	const emailConflict = isEmailConflictError(errors);
	if (emailConflict) {
		const params = new URLSearchParams({
			scenario: emailConflict.isNewUser ? 'new' : 'change',
			email: emailConflict.maskedConflictingEmail,
			ref: emailConflict.refId
		});
		if (emailConflict.maskedExistingEmail) {
			params.set('existingEmail', emailConflict.maskedExistingEmail);
		}
		redirect(302, `/auth/email-conflict?${params.toString()}`);
	}

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
