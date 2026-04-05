import { getLogoutUrl, oidcRoles } from '$api/services/OIDC';
import { DateTime } from '$db/generated/graphql/inputs';
import { builder } from '../builder';

const OIDCRolesEnum = builder.enumType('OIDCRolesEnum', {
	values: oidcRoles
});

builder.queryFields((t) => {
	return {
		myOIDCRoles: t.field({
			type: [OIDCRolesEnum],
			resolve: (root, args, ctx) => {
				return ctx.oidc.user?.OIDCRoleNames ?? [];
			}
		})
	};
});

builder.queryFields((t) => {
	return {
		logoutUrl: t.string({
			resolve: (root, args, ctx) => {
				return getLogoutUrl(ctx.url).toString();
			}
		})
	};
});

builder.queryFields((t) => {
	return {
		offlineUserRefresh: t.field({
			type: t.builder.simpleObject('OfflineUserRefresh', {
				fields: (t) => ({
					user: t.field({
						type: builder.simpleObject('OfflineUser', {
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
								ssoIdentities: t.field({
									type: [
										builder.simpleObject('OfflineUserSsoIdentity', {
											fields: (t) => ({
												issuer: t.string(),
												identityId: t.string()
											})
										})
									],
									nullable: true
								}),
								socialIdentities: t.stringList({ nullable: true })
							})
						}),
						nullable: true
					}),
					nextTokenRefreshDue: t.field({
						type: DateTime,
						nullable: true
					})
				})
			}),
			resolve: (root, args, ctx) => {
				const user = ctx.oidc.user;
				// TYPE-SAFETY-EXCEPTION: `password` and `mfa` are custom JWT claims
				// injected by Logto's Custom JWT feature. They exist on the OIDCUser
				// index signature but TypeScript loses it after the spread in oidc context.
				const claims = user as Record<string, unknown> | undefined;
				return {
					user: user
						? {
								...user,
								hasPassword: (claims?.['password'] as boolean) ?? null,
								mfaVerificationFactors: (claims?.['mfa'] as string[]) ?? null,
								ssoIdentities:
									(claims?.['sso_identities'] as
										| { issuer: string; identityId: string }[]
										| undefined) ?? null,
								socialIdentities: (claims?.['social_identities'] as string[] | undefined) ?? null
							}
						: null,
					nextTokenRefreshDue: ctx.oidc.nextTokenRefreshDue
				};
			}
		})
	};
});
