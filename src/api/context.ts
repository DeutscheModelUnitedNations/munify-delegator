import type { RequestEvent } from '@sveltejs/kit';
import type { OIDCSession } from '@m1212e/sveltekit-oidc';
import { OIDC_ROLE_CLAIM } from '$app/env/private';
import { oidcRoles } from './services/OIDC';
import { roleNamesInClaim } from './roleClaim';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '#api/services/errors/apiError.js';

type OidcRole = (typeof oidcRoles)[number];

/** The system roles a session's tokens grant. */
export function rolesOfSession(session: OIDCSession | undefined): OidcRole[] {
	if (!OIDC_ROLE_CLAIM || !session) return [];
	const tokens = [session.accessTokenClaims, session.idTokenClaims];
	return roleNamesInClaim(tokens, OIDC_ROLE_CLAIM).filter((role): role is OidcRole =>
		(oidcRoles as readonly string[]).includes(role)
	);
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
export function sessionUser(locals: RequestEvent['locals'], OIDCRoleNames: OidcRole[]) {
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
		...((session?.idTokenClaims as Record<string, unknown> | undefined) ?? {}),
		...((session?.accessTokenClaims as Record<string, unknown> | undefined) ?? {})
	};
}

export function context(req: RequestEvent) {
	const session = req.locals.oidc;
	const OIDCRoleNames = effectiveRoles(session);
	const user = sessionUser(req.locals, OIDCRoleNames);
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
				throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
			}
			return user;
		},
		hasRole: (role: OidcRole) => OIDCRoleNames.includes(role)
	};
}

export type Context = ReturnType<typeof context>;
