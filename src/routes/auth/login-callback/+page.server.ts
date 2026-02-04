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

const upsertMutation = graphql(`
	mutation UpserSelf {
		upsertSelf {
			userNeedsAdditionalInfo
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

function isEmailConflictError(
	errors: readonly { extensions?: Record<string, unknown> }[] | null | undefined
): EmailConflictExtensions | null {
	if (!errors) return null;
	for (const err of errors) {
		if (err.extensions?.code === 'EMAIL_CONFLICT') {
			return err.extensions as unknown as EmailConflictExtensions;
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

		const params = new URLSearchParams({
			type: errorType,
			description: errorMessage
		});
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

	if (data?.upsertSelf?.userNeedsAdditionalInfo) {
		redirect(302, `/my-account?redirect=${encodeURIComponent(state.visitedUrl)}`);
	} else {
		redirect(302, state.visitedUrl);
	}
};
