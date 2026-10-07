import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/api/db/schema';
import type { Insert } from '../../src/api/db/rows';
import { makeSeedTeamMember } from '../../src/api/db/seed-data/teamMember';

/** Puts a user on a conference's team, under an id derived from the user so reruns update it. */
export async function upsertTeamMember(
	db: NodePgDatabase,
	conferenceId: string,
	userId: string,
	role: Insert<'teamMember'>['role']
) {
	const teamMember = {
		...makeSeedTeamMember({ conferenceId, userId, role }),
		id: `e2e-team-${userId}`
	};
	await db
		.insert(schema.teamMember)
		.values(teamMember)
		.onConflictDoUpdate({ target: schema.teamMember.id, set: teamMember });
}
