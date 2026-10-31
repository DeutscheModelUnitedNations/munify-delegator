import { db } from '#api/db/db';
import { lockedCommitteeSeats } from './seatRules';

/**
 * What the seat planning has to work around: the committee seats members of assigned delegations
 * sit in (`lockedCommitteeSeats`), and how many members the delegation assigned to each role has.
 */
export async function loadSeatPlanningAssignments(conferenceId: string) {
	const delegations = await db.query.delegation.findMany({
		where: { conferenceId, assignedRoleId: { isNotNull: true } },
		columns: { assignedRoleId: true },
		with: {
			assignedRole: { columns: { nationAlpha3Code: true } },
			members: {
				columns: { assignedCommitteeId: true },
				with: { user: { columns: { givenName: true, familyName: true } } }
			}
		}
	});

	const assigned = delegations.flatMap(({ assignedRoleId, assignedRole, members }) =>
		assignedRoleId
			? [
					{
						roleId: assignedRoleId,
						nationAlpha3Code: assignedRole?.nationAlpha3Code ?? null,
						members
					}
				]
			: []
	);

	return {
		committeeSeats: lockedCommitteeSeats(assigned),
		roles: assigned.map(({ roleId, nationAlpha3Code, members }) => ({
			roleId,
			nationAlpha3Code,
			memberCount: members.length
		}))
	};
}
