import { z } from 'zod';

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

/** Provider extras the library's parsed user does not model; null when omitted or reshaped. */
const providerExtras = z.object({
	password: z.boolean().nullable().catch(null),
	mfa: z.array(z.string()).nullable().catch(null),
	sso_identities: z
		.array(z.object({ issuer: z.string(), identityId: z.string() }))
		.nullable()
		.catch(null),
	social_identities: z.array(z.string()).nullable().catch(null)
});

/**
 * The session's user as the client sees it. Provider extras the library's parsed user does not
 * model are read off the raw token claims and narrowed rather than trusted.
 */
export function offlineUserOf({
	user,
	claims
}: {
	user: SessionUser;
	claims: Record<string, unknown>;
}) {
	const extras = providerExtras.parse(claims);
	return {
		sub: user.sub,
		email: user.email ?? '',
		preferred_username: user.preferred_username ?? null,
		family_name: user.family_name ?? null,
		given_name: user.given_name ?? null,
		locale: user.locale ?? null,
		phone: user.phone ?? null,
		hasPassword: extras.password,
		mfaVerificationFactors: extras.mfa,
		ssoIdentities: extras.sso_identities,
		socialIdentities: extras.social_identities
	};
}
