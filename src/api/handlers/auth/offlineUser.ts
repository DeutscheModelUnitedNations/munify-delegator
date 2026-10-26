/** The signed-in user as the OIDC library parses it. */
interface SessionUser {
	sub: string;
	email?: string | null;
	preferred_username?: string | null;
	family_name?: string | null;
	given_name?: string | null;
	locale?: string | null;
	phone?: string | null;
}

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === 'string');

const isSsoIdentities = (value: unknown): value is { issuer: string; identityId: string }[] =>
	Array.isArray(value) &&
	value.every(
		(item) =>
			item !== null &&
			typeof item === 'object' &&
			'issuer' in item &&
			'identityId' in item &&
			typeof item.issuer === 'string' &&
			typeof item.identityId === 'string'
	);

/** A claim of the expected shape, or null when the provider omits or reshapes it. */
const claim = <T>(value: unknown, is: (value: unknown) => value is T) => (is(value) ? value : null);

/**
 * The session's user as the client sees it. Provider extras the library's parsed user does not
 * model are read off the raw token claims and narrowed rather than trusted.
 */
export function offlineUserOf(user: SessionUser, claims: Record<string, unknown>) {
	return {
		sub: user.sub,
		email: user.email ?? '',
		preferred_username: user.preferred_username ?? null,
		family_name: user.family_name ?? null,
		given_name: user.given_name ?? null,
		locale: user.locale ?? null,
		phone: user.phone ?? null,
		hasPassword: claim(claims['password'], isBoolean),
		mfaVerificationFactors: claim(claims['mfa'], isStringArray),
		ssoIdentities: claim(claims['sso_identities'], isSsoIdentities),
		socialIdentities: claim(claims['social_identities'], isStringArray)
	};
}
