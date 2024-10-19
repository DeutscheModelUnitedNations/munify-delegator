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
								preferred_username: t.string(),
								family_name: t.string(),
								given_name: t.string(),
								locale: t.string({ nullable: true }),
								phone: t.string({ nullable: true })
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
				return { user: ctx.oidc.user, nextTokenRefreshDue: ctx.oidc.nextTokenRefreshDue };
			}
		})
	};
});
