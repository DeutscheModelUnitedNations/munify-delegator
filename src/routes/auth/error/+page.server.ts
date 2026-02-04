import type { PageServerLoad } from './$types';
import { configPublic } from '$config/public';

// Known OIDC error codes and their meanings
const OIDC_ERROR_TYPES = [
	'access_denied',
	'login_required',
	'consent_required',
	'invalid_request',
	'server_error',
	'temporarily_unavailable'
] as const;

type OIDCErrorType = (typeof OIDC_ERROR_TYPES)[number];

// Internal error types for non-OIDC errors
const INTERNAL_ERROR_TYPES = ['token_exchange_failed', 'state_mismatch', 'network_error'] as const;

type InternalErrorType = (typeof INTERNAL_ERROR_TYPES)[number];

type ErrorType = OIDCErrorType | InternalErrorType | 'unknown';

export const load: PageServerLoad = async ({ url }) => {
	const errorType = url.searchParams.get('type') as ErrorType | null;
	const errorDescription = url.searchParams.get('description');

	return {
		errorType: errorType ?? 'unknown',
		errorDescription,
		supportEmail: configPublic.PUBLIC_SUPPORT_EMAIL
	};
};
