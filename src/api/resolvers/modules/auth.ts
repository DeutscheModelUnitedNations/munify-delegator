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

				// Type guards for custom JWT claims
				const isBooleanClaim = (value: unknown): value is boolean => {
					return typeof value === 'boolean';
				};

				const isStringArrayClaim = (value: unknown): value is string[] => {
					return Array.isArray(value) && value.every((item) => typeof item === 'string');
				};

				const isSsoIdentitiesArrayClaim = (
					value: unknown
				): value is { issuer: string; identityId: string }[] => {
					return (
						Array.isArray(value) &&
						value.every(
							(item) =>
								item &&
								typeof item === 'object' &&
								'issuer' in item &&
								'identityId' in item &&
								typeof item.issuer === 'string' &&
								typeof item.identityId === 'string'
						)
					);
				};

				// Extract custom JWT claims with runtime validation
				const passwordClaim = user?.['password'];
				const mfaClaim = user?.['mfa'];
				const ssoIdentitiesClaim = user?.['sso_identities'];
				const socialIdentitiesClaim = user?.['social_identities'];

				return {
					user: user
						? {
								...user,
								hasPassword: isBooleanClaim(passwordClaim) ? passwordClaim : null,
								mfaVerificationFactors: isStringArrayClaim(mfaClaim) ? mfaClaim : null,
								ssoIdentities: isSsoIdentitiesArrayClaim(ssoIdentitiesClaim)
									? ssoIdentitiesClaim
									: null,
								socialIdentities: isStringArrayClaim(socialIdentitiesClaim)
									? socialIdentitiesClaim
									: null
							}
						: null,
					nextTokenRefreshDue: ctx.oidc.nextTokenRefreshDue
				};
			}
		})
	};
});