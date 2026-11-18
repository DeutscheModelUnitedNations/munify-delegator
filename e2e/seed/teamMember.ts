import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedTeamMember } from '../../src/api/db/seed-data/teamMember';

/** Puts a user on a conference's team, under an id derived from the user so reruns update it. */
export async function upsertTeamMember(
	db: NodePgDatabase,
	conferenceId: string,
	userId: string,
	role: (typeof schema.teamMember.$inferInsert)['role']
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

/**
 * Puts the people on a conference's team as a run should find them: each with their role and
 * without any committee function a run before handed out. Answers their team member ids.
 */
export async function resetTeam(
	db: NodePgDatabase,
	{
		conferenceId,
		team
	}: {
		conferenceId: string;
		team: readonly { id: string; role: (typeof schema.teamMember.$inferInsert)['role'] }[];
	}
) {
	const teamMemberIds = team.map((person) => `e2e-team-${person.id}`);
	await db
		.delete(schema.teamFunction)
		.where(inArray(schema.teamFunction.teamMemberId, teamMemberIds));
	for (const person of team) {
		await upsertTeamMember(db, conferenceId, person.id, person.role);
	}
	return teamMemberIds;
}
