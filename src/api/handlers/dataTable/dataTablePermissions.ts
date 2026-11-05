import type { ApiContext } from '#api/rumble';
import { assertTeamPermission, hasTeamPermission } from '#api/services/authHelper/rules';
import type { TeamPermission } from '#lib/helpers/teamRoles';
import type { DataTableKey } from '#lib/dataGrid/tableKeys';
import type { DataTableAccess } from './source';

/**
 * Who reads a table, by the team permission its page asks for (`#lib/data/teamRoutes`): filtering
 * and ordering by contact data and care status would reveal both to anyone else. The team members
 * table is the team admins'.
 */
export const DATA_TABLE_PERMISSION: Record<DataTableKey, TeamPermission> = {
	participants: 'manageParticipants',
	waitingList: 'manageParticipants',
	schools: 'manageParticipants',
	teamMembers: 'manageTeam'
};

/**
 * Refuses (FORBIDDEN) unless the caller holds the table's team permission in the conference.
 * Returns what else the caller may read: `teamDetails` (the team members' address, gender and food
 * preference) for those who also hold `manageTeam`; without it those columns are blank on the
 * team's rows of the participants table, so filtering by them reveals nothing.
 */
export async function assertCanReadDataTable({
	ctx,
	table,
	conferenceId
}: {
	ctx: ApiContext;
	table: DataTableKey;
	conferenceId: string;
}): Promise<DataTableAccess> {
	await assertTeamPermission({ ctx, conferenceId, permission: DATA_TABLE_PERMISSION[table] });
	const teamDetails = await hasTeamPermission({ ctx, conferenceId, permission: 'manageTeam' });
	return { teamDetails };
}
