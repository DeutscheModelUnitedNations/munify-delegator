import { db, schema } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { teamMemberPubsub } from '#api/pubsub';
import type { TeamRole } from '#api/services/authHelper/rules';

/** Gives the team member `id` another role. */
export async function changeTeamRole({ id, role }: { id: string; role: TeamRole }) {
	await db
		.update(schema.teamMember)
		.set({ role })
		.where(whereRows({ table: schema.teamMember, filter: { id } }));
	teamMemberPubsub.updated(id);
}
