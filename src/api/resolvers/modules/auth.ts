import { getLogoutUrl, oidcRoles } from '$api/services/OIDC';
import { builder } from '../builder';

const OIDCRolesEnum = builder.enumType('OIDCRolesEnum', {
	values: oidcRoles
});

builder.queryFields((t) => {
	return {
		myOIDCRoles: t.field({
			type: [OIDCRolesEnum],
			resolve: (root, args, ctx) => {
				return ctx.oidc.user?.systemRoleNames ?? [];
			}
		})
	};
});

builder.queryFields((t) => {
	return {
		logoutUrl: t.string({
			resolve: (root, args, ctx) => {
				return getLogoutUrl(ctx.url);
			}
		})
	};
});
