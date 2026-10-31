import { type Transaction, db, schema } from '#api/db/db';
import { lockConference } from '#api/db/lockConference';
import { whereRows } from '#api/db/whereRows';
import { teamMemberPubsub } from '#api/pubsub';
import type { TeamRole } from '#api/services/authHelper/rules';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/**
 * Runs `write` on the team member `id` in a transaction that refuses (CONFLICT) to take the team's
 * last project management away (a team that never had any is not stopped from changing), unless
 * `keepProjectManagement` is off. Changes to one team wait for each other (a lock on the
 * conference), so two project managers demoting each other at once cannot both get through.
 */
async function changeMembership({
	id,
	keepProjectManagement,
	write
}: {
	id: string;
	keepProjectManagement: boolean;
	write: (tx: Transaction) => Promise<unknown>;
}) {
	await db.transaction(async (tx) => {
		const found = await tx.query.teamMember.findFirst({
			where: { id },
			columns: { conferenceId: true }
		});
		if (!found) return;
		await lockConference({ tx, conferenceId: found.conferenceId });
		// Read again under the lock: another change to the team may have just committed.
		const member = await tx.query.teamMember.findFirst({
			where: { id },
			columns: { conferenceId: true, role: true }
		});
		if (!member) return;

		await write(tx);

		if (!keepProjectManagement || member.role !== 'PROJECT_MANAGEMENT') return;
		const remaining = await tx.query.teamMember.findFirst({
			where: { conferenceId: member.conferenceId, role: 'PROJECT_MANAGEMENT' },
			columns: { id: true }
		});
		if (!remaining) {
			throw apiError({ code: 'CONFLICT', message: m.teamNeedsProjectManagement() });
		}
	});
}

/**
 * Gives the team member `id` another role. With `keepProjectManagement`, refuses (CONFLICT) to
 * demote the team's last project management.
 */
export async function changeTeamRole({
	id,
	role,
	keepProjectManagement
}: {
	id: string;
	role: TeamRole;
	keepProjectManagement: boolean;
}) {
	await changeMembership({
		id,
		keepProjectManagement,
		write: (tx) =>
			tx
				.update(schema.teamMember)
				.set({ role })
				.where(whereRows({ table: schema.teamMember, filter: { id } }))
	});
	teamMemberPubsub.updated(id);
}

/**
 * Takes the team member `id` off the team. With `keepProjectManagement`, refuses (CONFLICT) to
 * remove the team's last project management.
 */
export async function removeTeamMember({
	id,
	keepProjectManagement
}: {
	id: string;
	keepProjectManagement: boolean;
}) {
	await changeMembership({
		id,
		keepProjectManagement,
		write: (tx) =>
			tx.delete(schema.teamMember).where(whereRows({ table: schema.teamMember, filter: { id } }))
	});
	teamMemberPubsub.removed();
}
