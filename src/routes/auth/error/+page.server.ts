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

// All valid error types for validation
const ALL_ERROR_TYPES: readonly string[] = [...OIDC_ERROR_TYPES, ...INTERNAL_ERROR_TYPES];

// Type guard for proper type narrowing without casting
function isKnownErrorType(value: string | null): value is OIDCErrorType | InternalErrorType {
	return value !== null && ALL_ERROR_TYPES.includes(value);
}

export const load: PageServerLoad = async ({ url }) => {
	const rawErrorType = url.searchParams.get('type');
	const errorType: ErrorType = isKnownErrorType(rawErrorType) ? rawErrorType : 'unknown';
	const errorDescription = url.searchParams.get('description');

	return {
		errorType,
		errorDescription,
		supportEmail: configPublic.PUBLIC_SUPPORT_EMAIL
	};
};
