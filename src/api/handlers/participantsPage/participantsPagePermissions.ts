import type { ApiContext } from '#api/rumble';
import { assertTeamPermission, hasTeamPermission } from '#api/services/authHelper/rules';

/**
 * Refuses (FORBIDDEN) unless the caller holds `manageParticipants` (project management and
 * participant care) in the conference: filtering and ordering by contact data and care status
 * would reveal both to anyone else.
 *
 * Returns `teamDetails`: whether the caller also holds `manageTeam` (project management and team
 * coordinator), who read the team members' address, gender and food preference. The table lists
 * the team too, and participant care reads only their teammates' names and contact details, so
 * without it those columns filter and order the team as if they were empty.
 */
export async function assertCanReadParticipantsPage({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	const teamDetails = await hasTeamPermission({ ctx, conferenceId, permission: 'manageTeam' });
	return { teamDetails };
}
