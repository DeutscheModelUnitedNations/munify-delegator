import Elysia from 'elysia';
import { type Action, defineAbilitiesForUser } from './abilities/abilities';
import { oidcPlugin } from './oidc';
import { accessibleBy } from '@casl/prisma';
import { logger, PermissionCheckError } from '$api/util/logger';

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
