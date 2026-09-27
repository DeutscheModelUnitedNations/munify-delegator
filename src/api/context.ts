import { oidc } from './services/oidcContext';
import type { RequestEvent } from '@sveltejs/kit';
import { GraphQLError } from 'graphql';
import { oidcRoles } from './services/OIDC';

/**
 * Builds the request context every handler sees: the OIDC data derived from the request cookies,
 * the request itself, and the two helpers handlers reach for most often.
 */
export async function context(req: RequestEvent) {
	const oidcValue = await oidc(req.cookies);
	return {
		oidc: oidcValue,
		url: req.url,
		event: req,
		mustBeLoggedIn: () => {
			if (!oidcValue.user) {
				throw new GraphQLError('Must be logged in');
			}
			return oidcValue.user;
		},
		hasRole: (role: (typeof oidcRoles)[number]) => oidcValue.user?.hasRole(role) ?? false
	};
}

export type Context = Awaited<ReturnType<typeof context>>;
