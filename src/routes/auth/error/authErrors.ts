import { m } from '$lib/paraglide/messages';

// Known OIDC error codes, plus the internal ones the app raises itself. Anything else is
// reported as unknown rather than echoed back into the page.
const ERROR_TYPES = [
	'access_denied',
	'login_required',
	'consent_required',
	'invalid_request',
	'server_error',
	'temporarily_unavailable',
	'token_exchange_failed',
	'state_mismatch',
	'network_error'
] as const;

export type AuthErrorType = (typeof ERROR_TYPES)[number] | 'unknown';

/** The error type the login flow reported, or `unknown` for anything not recognised. */
export function parseAuthErrorType(value: string | null): AuthErrorType {
	return ERROR_TYPES.find((type) => type === value) ?? 'unknown';
}

/** Errors that mean the person was not allowed in, rather than that something broke. */
export function isAccessError(type: AuthErrorType) {
	return type === 'access_denied' || type === 'consent_required' || type === 'login_required';
}

const TITLES: Partial<Record<AuthErrorType, () => string>> = {
	access_denied: m.authErrorAccessDeniedTitle,
	login_required: m.authErrorLoginRequiredTitle,
	consent_required: m.authErrorLoginRequiredTitle,
	server_error: m.authErrorProviderUnavailableTitle,
	temporarily_unavailable: m.authErrorProviderUnavailableTitle,
	token_exchange_failed: m.authErrorTechnicalTitle,
	state_mismatch: m.authErrorTechnicalTitle,
	network_error: m.authErrorTechnicalTitle
};

const DESCRIPTIONS: Partial<Record<AuthErrorType, () => string>> = {
	access_denied: m.authErrorAccessDeniedDescription,
	login_required: m.authErrorLoginRequiredDescription,
	consent_required: m.authErrorLoginRequiredDescription,
	server_error: m.authErrorProviderUnavailableDescription,
	temporarily_unavailable: m.authErrorProviderUnavailableDescription,
	token_exchange_failed: m.authErrorTokenExchangeDescription,
	state_mismatch: m.authErrorStateMismatchDescription,
	network_error: m.authErrorNetworkDescription
};

/** The headline shown for an error type. */
export function authErrorTitle(type: AuthErrorType): string {
	return (TITLES[type] ?? m.authErrorGenericTitle)();
}

/** The explanation shown for an error type. */
export function authErrorDescription(type: AuthErrorType): string {
	return (DESCRIPTIONS[type] ?? m.authErrorGenericDescription)();
}
