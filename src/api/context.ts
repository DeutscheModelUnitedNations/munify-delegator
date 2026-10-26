import type { RequestEvent } from '@sveltejs/kit';
import { OIDC_ROLE_CLAIM } from '$app/env/private';
import { oidcRoles } from './services/OIDC';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '#api/services/errors/apiError.js';

function parseRoles(locals: RequestEvent['locals']): (typeof oidcRoles)[number][] {
	if (!OIDC_ROLE_CLAIM) return [];

	const claim = OIDC_ROLE_CLAIM;
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
		hasRole: (role: (typeof oidcRoles)[number]) => OIDCRoleNames.includes(role)
	};
}

export type Context = ReturnType<typeof context>;
