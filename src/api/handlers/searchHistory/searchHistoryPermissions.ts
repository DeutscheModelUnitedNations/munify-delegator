import { abilityBuilder, type ApiContext } from '#api/rumble';
import { assertTeamPermission, systemAdmin, userId, where } from '#api/services/authHelper';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

export function registerSearchHistoryAbilities() {
	// A history is only ever read by the person who made it, from any of their devices.
	abilityBuilder.searchHistory.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.searchHistory.allow('read').when((ctx) => {
		const id = userId(ctx);
		return where(id ? { userId: id } : undefined);
	});
}

/**
 * Refuses unless the caller is on the conference's team, whose search this is. Returns the
 * caller's id, whose history the search goes into.
 */
export async function assertCanRecordSearch(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'useTeamTools');
	const id = userId(ctx);
	if (!id) throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
	return id;
}
