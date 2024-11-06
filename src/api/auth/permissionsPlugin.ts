import Elysia from 'elysia';
import { type Action, AllEntityNameValues, defineAbilitiesForUser } from './abilities/abilities';
import { oidcPlugin } from './oidcPlugin';
import { accessibleBy } from '@casl/prisma';
import { logger, PermissionCheckError } from '$api/util/logger';
import type { ForbiddenError } from '@casl/ability';

export const permissionsPlugin = new Elysia({
	name: 'permissions'
})
	.use(oidcPlugin)
	.derive({ as: 'scoped' }, ({ oidc }) => {
		const abilities = defineAbilitiesForUser(oidc);
		let hasBeenCalled = false;
		return {
			permissions: {
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
					try {
						return accessibleBy(abilities, action);
					} catch (error) {
						//TODO this is not a nice solution
						if ((error as ForbiddenError<any>).message.startsWith("It's not allowed to run")) {
							const dummy = { id: 'THIS_CHAR~WILL_NEVER_APPEAR_AS_ID_CHAR' };
							const values = AllEntityNameValues.map(
								(k) => k[0].toUpperCase() + k.slice(1).toLowerCase()
							) as Capitalize<(typeof AllEntityNameValues)[number]>[];

							const ret: ReturnType<typeof accessibleBy> = {} as any;
							values.forEach((v) => (ret[v] = dummy));
							return ret;
						}
						throw error;
					}
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
				mustBeLoggedIn: () => {
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
			}
		};
	})
	.use(logger)
	.onAfterHandle({ as: 'global' }, ({ request, path, set, permissions, requestId }) => {
		if (!permissions?.werePermissionsChecked()) {
			console.warn(
				`[${requestId}]: Permissions were not checked on handler ${request.method} ${path} with status ${set.status}`
			);
		}
	});
