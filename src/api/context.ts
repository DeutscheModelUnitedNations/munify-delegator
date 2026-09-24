import { defineAbilitiesForUser, type Action } from '$api/abilities/abilities';
import { accessibleBy } from '@casl/prisma';
import { oidc, type OIDC } from './services/oidcContext';
import type { RequestEvent } from '@sveltejs/kit';
import { GraphQLError } from 'graphql';
import { oidcRoles } from './services/OIDC';

export class PermissionCheckError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PermissionCheckError';
	}
}

export function permissions(oidc: OIDC) {
	const abilities = defineAbilitiesForUser(oidc);
	let hasBeenCalled = false;
	return {
		abilities,
		/**
		 * Prisma utility for running authorized database calls. Should be used in WHERE conditions in queries like this:
		 *
		 * ```ts
		 * db.committee.deleteMany({
		 *   where: {
		 *     conferenceId: params.conferenceId,
		 *     AND: [permissions.allowDatabaseAccessTo("delete").Committee],
		 *   }
		 * })
		 * ```
		 * The default operation is "read".
		 */
		allowDatabaseAccessTo: (action: Action = 'read') => {
			hasBeenCalled = true;
			return accessibleBy(abilities, action);
		},
		/**
		 * Utility that raises and error if the permissions check fails.
		 * Allows for readable flow of permission checks which resemble natural language like this:
		 *
		 * ```ts
		 * permissions.checkIf((user) => user.can("create", "Committee"));
		 * ```
		 */
		checkIf: (perms: boolean | ((a: typeof abilities) => boolean)) => {
			hasBeenCalled = true;
			if (typeof perms === 'boolean') {
				if (!perms) {
					throw new PermissionCheckError('Permission check failed.');
				}
			} else {
				if (!perms(abilities)) {
					throw new PermissionCheckError('Permission check failed.');
				}
			}
		},
		getLoggedInUserOrThrow: () => {
			hasBeenCalled = true;
			if (!oidc || !oidc.user) {
				throw new PermissionCheckError('Permission check failed.');
			}
			return oidc.user;
		},
		/**
		 * @returns True if permissions were checked. Used to emit warnings for handlers which do not check permissions.
		 */
		werePermissionsChecked: () => hasBeenCalled,
		/**
		 * Disable the warning that is emitted when permissions are not checked for this handler
		 */
		disablePermissionCheckWarning: () => (hasBeenCalled = true)
	};
}

/**
 * Builds request context including OIDC data, computed permissions, the original URL, and the request event.
 *
 * @param req - The incoming request event.
 * @returns An object with:
 *  - permissions: computed permission set for the request
 *  - oidc: OIDC authentication information derived from the request cookies
 *  - url: the request URL
 *  - event: the original RequestEvent
 */
export async function context(req: RequestEvent) {
	const oidcValue = await oidc(req.cookies);
	const perms = permissions(oidcValue);
	return {
		permissions: perms,
		oidc: oidcValue,
		url: req.url,
		event: req,
		/**
		 * Rumble-facing helpers, shaped like chase's context. `permissions` above is the
		 * CASL layer the legacy Pothos resolvers still use; it goes away once the last
		 * resolver module is replaced by a handler.
		 */
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
