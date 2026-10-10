import { schemaBuilder } from '$api/rumble';
import { OIDC, oidcRoles } from '$api/services/OIDC';

const OIDCRolesEnum = schemaBuilder.enumType('OIDCRolesEnum', { values: oidcRoles });

const OfflineUserSsoIdentity = schemaBuilder.simpleObject('OfflineUserSsoIdentity', {
	fields: (t) => ({ issuer: t.string(), identityId: t.string() })
});

const OfflineUser = schemaBuilder.simpleObject('OfflineUser', {
	fields: (t) => ({
		sub: t.string(),
		email: t.string(),
		preferred_username: t.string({ nullable: true }),
		family_name: t.string({ nullable: true }),
		given_name: t.string({ nullable: true }),
		locale: t.string({ nullable: true }),
		phone: t.string({ nullable: true }),
		hasPassword: t.boolean({ nullable: true }),
		mfaVerificationFactors: t.stringList({ nullable: true }),
		ssoIdentities: t.field({ type: [OfflineUserSsoIdentity], nullable: true }),
		socialIdentities: t.stringList({ nullable: true })
	})
});

const OfflineUserRefresh = schemaBuilder.simpleObject('OfflineUserRefresh', {
	fields: (t) => ({
		user: t.field({ type: OfflineUser, nullable: true }),
		nextTokenRefreshDue: t.field({ type: 'DateTime', nullable: true })
	})
});

const isBooleanClaim = (value: unknown): value is boolean => typeof value === 'boolean';

const isStringArrayClaim = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === 'string');

const isSsoIdentitiesArrayClaim = (
	value: unknown
): value is { issuer: string; identityId: string }[] =>
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

schemaBuilder.queryFields((t) => ({
	myOIDCRoles: t.field({
		type: [OIDCRolesEnum],
		resolve: (_root, _args, ctx) => ctx.oidc.user?.OIDCRoleNames ?? []
	}),

	logoutUrl: t.string({
		resolve: async (_root, _args, ctx) => (await OIDC.getLogoutUrl(ctx.url)).toString()
	}),

	/**
	 * The session as the client should see it, without a round trip to the identity provider.
	 * Claims that vary by provider are narrowed rather than trusted, so a provider that omits or
	 * reshapes one yields null instead of a type error at the boundary.
	 */
	offlineUserRefresh: t.field({
		type: OfflineUserRefresh,
		resolve: (_root, _args, ctx) => {
			const user = ctx.oidc.user;
			if (!user) {
				return { user: null, nextTokenRefreshDue: null };
			}

			// Provider extras the library's parsed user does not model, read off the raw token.
			const raw = (ctx.oidc.claims ?? {}) as Record<string, unknown>;
			const passwordClaim = raw['password'];
			const mfaClaim = raw['mfa'];
			const ssoIdentitiesClaim = raw['sso_identities'];
			const socialIdentitiesClaim = raw['social_identities'];

			return {
				user: {
					sub: user.sub,
					email: user.email ?? '',
					preferred_username: user.preferred_username ?? null,
					family_name: user.family_name ?? null,
					given_name: user.given_name ?? null,
					locale: user.locale ?? null,
					phone: user.phone ?? null,
					hasPassword: isBooleanClaim(passwordClaim) ? passwordClaim : null,
					mfaVerificationFactors: isStringArrayClaim(mfaClaim) ? mfaClaim : null,
					ssoIdentities: isSsoIdentitiesArrayClaim(ssoIdentitiesClaim) ? ssoIdentitiesClaim : null,
					socialIdentities: isStringArrayClaim(socialIdentitiesClaim) ? socialIdentitiesClaim : null
				},
				// The library refreshes on its own schedule and does not surface a deadline.
				nextTokenRefreshDue: null
			};
		}
	})
}));
