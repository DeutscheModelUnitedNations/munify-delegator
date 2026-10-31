import { abilityBuilder, type ApiContext } from '#api/rumble';
import { assertTeamPermission, systemAdmin } from '#api/services/authHelper/rules';
import { callerUserId, grantWhere } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

export function registerSearchHistoryAbilities() {
	// System admins read, update and delete every history.
	abilityBuilder.searchHistory.allow(['read', 'update', 'delete']).when(systemAdmin);
	// Everybody reads their own search history, from any of their devices.
	abilityBuilder.searchHistory.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return grantWhere(id ? { userId: id } : undefined);
	});
}

/**
 * Refuses unless the caller is on the conference's team (`useTeamTools`), whose search this is.
 * Returns the caller's id, whose history the search goes into.
 */
export async function assertCanRecordSearch({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'useTeamTools' });
	const id = callerUserId(ctx);
	if (!id) throw apiError({ code: 'UNAUTHENTICATED', message: m.mustBeLoggedIn() });
	return { userId: id };
}
