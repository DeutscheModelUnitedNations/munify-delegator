import { schemaBuilder } from '#api/rumble';
import { OIDC } from '#api/services/oidc/OIDC';
import { oidcRoles } from '#api/services/oidc/oidcRoles';
import { offlineUserOf } from './authService';
import { oidcIdentityFields } from './oidcIdentityFields';

const OIDCRolesEnum = schemaBuilder.enumType('OIDCRolesEnum', { values: oidcRoles });

const OfflineUserSsoIdentity = schemaBuilder.simpleObject('OfflineUserSsoIdentity', {
	fields: (t) => ({ issuer: t.string(), identityId: t.string() })
});

const OfflineUser = schemaBuilder.simpleObject('OfflineUser', {
	fields: (t) => ({
		...oidcIdentityFields(t),
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
		user: t.field({
			type: OfflineUser,
			nullable: true,
			description: 'The signed-in person; null when signed out.'
		})
	})
});

schemaBuilder.queryFields((t) => ({
	myOIDCRoles: t.field({
		description: 'The system roles the identity provider grants the caller; empty when signed out.',
		type: [OIDCRolesEnum],
		resolve: (_root, _args, ctx) => ctx.oidc.user?.OIDCRoleNames ?? []
	}),

	logoutUrl: t.string({
		description: 'Where to send the browser to end the session at the identity provider.',
		resolve: async (_root, _args, ctx) => (await OIDC.getLogoutUrl(ctx.event)).toString()
	}),

	offlineUserRefresh: t.field({
		description:
			'The session as the client should see it, without a round trip to the identity provider; while impersonating, the impersonated person. Claims that vary by provider are narrowed rather than trusted, so a provider that omits or reshapes one yields null instead of a type error at the boundary.',
		type: OfflineUserRefresh,
		resolve: (_root, _args, ctx) => {
			const user = ctx.oidc.user;
			return { user: user ? offlineUserOf({ user, claims: ctx.oidc.claims }) : null };
		}
	})
}));
