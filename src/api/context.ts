import type { RequestEvent } from '@sveltejs/kit';
import { GraphQLError } from 'graphql';
import { configPrivate } from '$config/private';
import { oidcRoles } from './services/OIDC';

/**
 * Reads the roles claim, whose shape depends on the provider: Logto sends an array of names or
 * role objects, Zitadel an object keyed by role name.
 */
function parseRoles(locals: RequestEvent['locals']): (typeof oidcRoles)[number][] {
	if (!configPrivate.OIDC_ROLE_CLAIM) return [];

	const claim = configPrivate.OIDC_ROLE_CLAIM;
	const rolesRaw =
		(locals.oidc?.accessToken as Record<string, unknown> | undefined)?.[claim] ??
		(locals.oidc?.idToken as Record<string, unknown> | undefined)?.[claim];
	if (!rolesRaw) return [];

	const collected: string[] = [];
	if (Array.isArray(rolesRaw)) {
		for (const role of rolesRaw) {
			const name = typeof role === 'string' ? role : (role as { name?: string })?.name;
			if (name) collected.push(name);
		}
	} else if (typeof rolesRaw === 'object') {
		collected.push(...Object.keys(rolesRaw));
	}

	return collected.filter((role): role is (typeof oidcRoles)[number] =>
		(oidcRoles as readonly string[]).includes(role)
	);
}

/**
 * Builds the request context every handler sees.
 *
 * The session itself comes from `event.locals.oidc`, which `OIDC.handle` puts there — the app no
 * longer parses cookies or validates tokens of its own accord.
 */
export function context(req: RequestEvent) {
	const OIDCRoleNames = parseRoles(req.locals);
	const parsedUser = req.locals.oidc?.user;

	const user = parsedUser
		? {
				...parsedUser,
				email: parsedUser.email ?? undefined,
				OIDCRoleNames,
				hasRole: (role: (typeof oidcRoles)[number]) => OIDCRoleNames.includes(role)
			}
		: undefined;

	// The tokens carry provider-specific claims the library's parsed user does not model.
	const claims = {
		...((req.locals.oidc?.idToken as Record<string, unknown> | undefined) ?? {}),
		...((req.locals.oidc?.accessToken as Record<string, unknown> | undefined) ?? {})
	};

	return {
		oidc: { user, claims },
		url: req.url,
		event: req,
		mustBeLoggedIn: () => {
			if (!user) {
				throw new GraphQLError('Must be logged in');
			}
			return user;
		},
		hasRole: (role: (typeof oidcRoles)[number]) => OIDCRoleNames.includes(role)
	};
}

export type Context = ReturnType<typeof context>;
