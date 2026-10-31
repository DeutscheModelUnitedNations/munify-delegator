import { schema, type Transaction } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { roleApplicationPubsub } from '#api/pubsub';
import { roleSeats } from '#lib/helpers/conferenceRole';
import { normalizeRoleApplicationRanks } from './normalizeRoleApplicationRanks';

/**
 * A delegation's size can change after it has applied for roles. This drops any application for a
 * role that can no longer seat everyone: for a nation, the seats are summed across every committee
 * that nation sits in; for a non-state actor it is its own seat count (`roleSeats`). Runs in the
 * transaction of the change that shrank the delegation or the role, so the two go in together.
 */
export async function tidyRoleApplications({
	delegationId,
	tx
}: {
	delegationId: string;
	tx: Transaction;
}) {
	const delegation = await tx.query.delegation.findFirst({
		where: { id: delegationId },
		columns: { id: true, conferenceId: true },
		with: {
			members: { columns: { id: true } },
			appliedForRoles: {
				columns: { id: true },
				with: { role: { columns: { id: true, kind: true, seatAmount: true } } }
			}
		}
	});
	if (!delegation) return;

	const committees = await tx.query.committee.findMany({
		where: { conferenceId: delegation.conferenceId },
		columns: { numOfSeatsPerDelegation: true },
		with: { roles: { columns: { id: true } } }
	});

	const memberCount = delegation.members.length;
	const tooSmall = delegation.appliedForRoles
		.filter((application) => memberCount > roleSeats({ role: application.role, committees }))
		.map((application) => application.id);

	if (tooSmall.length > 0) {
		await tx
			.delete(schema.roleApplication)
			.where(whereRows({ table: schema.roleApplication, filter: { id: { in: tooSmall } } }));
		roleApplicationPubsub.removed();
	}

	// Close the gaps the deletions above may have left in the ranking.
	await normalizeRoleApplicationRanks({ delegationId: delegation.id, tx });
}

/**
 * Re-checks the applications of every delegation of the conference that applied for one of the
 * given roles, e.g. after a nation lost a committee seat or a non-state actor got fewer seats.
 */
export async function tidyRoleApplicationsForRoles({
	conferenceId,
	roleIds,
	tx
}: {
	conferenceId: string;
	roleIds: string[];
	tx: Transaction;
}) {
	if (roleIds.length === 0) return;
	const delegations = await tx.query.delegation.findMany({
		where: { conferenceId, appliedForRoles: { roleId: { in: roleIds } } },
		columns: { id: true }
	});

	for (const delegation of delegations) {
		await tidyRoleApplications({ delegationId: delegation.id, tx });
	}
}
