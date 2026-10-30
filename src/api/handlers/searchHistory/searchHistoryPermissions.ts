import { abilityBuilder, type ApiContext } from '#api/rumble';
import { assertTeamPermission, systemAdmin } from '#api/services/authHelper/rules';
import { callerUserId, grantWhere } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

export function registerSearchHistoryAbilities() {
	// A history is only ever read by the person who made it, from any of their devices.
	abilityBuilder.searchHistory.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.searchHistory.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return grantWhere(id ? { userId: id } : undefined);
	});
}

/**
 * Refuses unless the caller is on the conference's team, whose search this is. Returns the
 * caller's id, whose history the search goes into.
 */
export async function assertCanRecordSearch(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'useTeamTools');
	const id = callerUserId(ctx);
	if (!id) throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
	return id;
}
