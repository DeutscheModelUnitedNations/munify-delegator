import { client } from './rumbleClient/client';

/**
 * The signed-in person, as the API reports them.
 *
 * Plain and uncached, so a server `load` can call it too; `$lib/state/currentUser.svelte` wraps it
 * with the browser-side singleton components use.
 */
export async function fetchCurrentUser() {
	const [refresh, roles] = await Promise.all([
		client.query.offlineUserRefresh({
			user: {
				sub: true,
				email: true,
				family_name: true,
				given_name: true,
				locale: true,
				phone: true,
				preferred_username: true,
				hasPassword: true,
				mfaVerificationFactors: true,
				ssoIdentities: { issuer: true, identityId: true },
				socialIdentities: true
			}
		}),
		client.query.myOIDCRoles()
	]);

	const claims = refresh.user;
	if (!claims) {
		throw new Error('Not signed in');
	}

	return {
		sub: claims.sub,
		email: claims.email,
		family_name: claims.family_name,
		given_name: claims.given_name,
		locale: claims.locale,
		phone: claims.phone,
		preferred_username: claims.preferred_username,
		hasPassword: claims.hasPassword,
		// The schema types these as non-null lists, but the resolver hands back nothing at all for
		// an account that has none - an OIDC provider without MFA or linked logins, for instance.
		mfaVerificationFactors: [...(claims.mfaVerificationFactors ?? [])],
		ssoIdentities: (claims.ssoIdentities ?? []).map((identity) => ({
			issuer: identity.issuer,
			identityId: identity.identityId
		})),
		socialIdentities: [...(claims.socialIdentities ?? [])],
		myOIDCRoles: [...roles],
		isAdmin: roles.includes('admin')
	};
}

/** Like `fetchCurrentUser`, for pages that also serve visitors who are not signed in. */
export async function fetchOptionalCurrentUser() {
	try {
		return await fetchCurrentUser();
	} catch {
		return null;
	}
}

export type CurrentUser = Awaited<ReturnType<typeof fetchCurrentUser>>;
