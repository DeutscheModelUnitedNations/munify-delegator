import type { RequestEvent } from '@sveltejs/kit';
import type { OIDCSession } from '@m1212e/sveltekit-oidc';
import { OIDC_ROLE_CLAIM, OIDC_ROLE_MAP } from '$app/env/private';
import type { OidcRole } from './services/oidc/oidcRoles';
import { appRolesOf, roleNamesInClaims } from './services/oidc/roleClaims';
import { userInfoClaims } from './services/oidc/userInfoClaims';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

/**
 * The system roles a session grants: the role names in the claim `OIDC_ROLE_CLAIM` names, in the
 * access token, the ID token or the userinfo answer (`userInfoHandle` in `#api/services/oidc/OIDC`), mapped
 * through `OIDC_ROLE_MAP`.
 */
export function rolesOfSession(session: OIDCSession | undefined): OidcRole[] {
	if (!OIDC_ROLE_CLAIM || !session) return [];
	const sources = [session.accessTokenClaims, session.idTokenClaims, userInfoClaims.of(session)];
	return appRolesOf({
		names: roleNamesInClaims({ sources, path: OIDC_ROLE_CLAIM }),
		roleMap: OIDC_ROLE_MAP
	});
}

/**
 * The system roles of whoever the request acts as. While impersonating that is only the roles both
 * the impersonated user and the impersonator hold: impersonating someone must never grant a role
 * the impersonator does not have, and never keep one the impersonated user does not have.
 */
export function effectiveRoles(session: OIDCSession | undefined): OidcRole[] {
	const roles = rolesOfSession(session);
	if (!session?.impersonator) return roles;
	const impersonatorRoles = rolesOfSession(session.impersonator);
	return roles.filter((role) => impersonatorRoles.includes(role));
}

/**
 * Who the request acts as. While impersonating, the exchanged token may carry little more than
 * `sub`; the identity the app shows comes from the impersonated user's row, which the
 * impersonation handle loaded into `locals.impersonatedIdentity`.
 */
export function sessionUser({
	locals,
	OIDCRoleNames
}: {
	locals: RequestEvent['locals'];
	OIDCRoleNames: OidcRole[];
}) {
	const session = locals.oidc;
	if (!session) return undefined;
	const identity = session.impersonator ? locals.impersonatedIdentity : undefined;
	return {
		...session.user,
		...identity,
		sub: session.user.sub,
		email: identity?.email ?? session.user.email ?? undefined,
		OIDCRoleNames,
		hasRole: (role: OidcRole) => OIDCRoleNames.includes(role)
	};
}

/** The tokens' claims, which carry provider-specific ones the library's parsed user does not model. */
export function sessionClaims(session: OIDCSession | undefined): Record<string, unknown> {
	return {
		...session?.idTokenClaims,
		...session?.accessTokenClaims
	};
}

export function context(req: RequestEvent) {
	const session = req.locals.oidc;
	const OIDCRoleNames = effectiveRoles(session);
	const user = sessionUser({ locals: req.locals, OIDCRoleNames });
	const claims = sessionClaims(session);

	return {
		oidc: {
			user,
			claims,
			/** The signed in user's own identity while they impersonate `user`, else undefined. */
			impersonator: session?.impersonator?.user
		},
		/**
		 * A function, read only by the resolvers that need it: SvelteKit 3 throws on `event.url`
		 * inside a remote query, which is how SSR runs the schema (`graphql.remote.ts`), and rumble
		 * spreads this object, so a getter would be read anyway. The resolvers calling it are
		 * mutations and browser-only queries, which arrive over `/api/graphql`. Not named `url`:
		 * envelop assigns the context onto the request event, whose `url` is read-only.
		 */
		requestUrl: () => req.url,
		event: req,
		mustBeLoggedIn: () => {
			if (!user) {
				throw apiError({ code: 'UNAUTHENTICATED', message: m.mustBeLoggedIn() });
			}
			return user;
		},
		hasRole: (role: OidcRole) => OIDCRoleNames.includes(role)
	};
}

export type Context = ReturnType<typeof context>;
