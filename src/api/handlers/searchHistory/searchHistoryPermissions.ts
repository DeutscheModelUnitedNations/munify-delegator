import { abilityBuilder, type ApiContext } from '#api/rumble';
import { assertTeamPermission, systemAdmin } from '#api/services/authHelper/rules';
import { callerUserId, grantWhere } from '#api/services/authHelper/utils';

export function registerSearchHistoryAbilities() {
	abilityBuilder.searchHistory.allow(['read', 'update', 'delete']).when(systemAdmin);
	// Everyone reads their own search history, from any of their devices. Nobody but a system admin
	// updates or deletes it: `recordSearch` writes it.
	abilityBuilder.searchHistory.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return grantWhere(id ? { userId: id } : undefined);
	});
}

/**
 * Refuses (FORBIDDEN) unless the caller holds `useTeamTools` (every team role) in the conference,
 * whose search this is. Returns the caller's id, whose history the search goes into.
 */
export async function assertCanRecordSearch({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'useTeamTools' });
	return { userId: ctx.mustBeLoggedIn().sub };
}
