import { db } from '#api/db/db';
import { schemaBuilder } from '#api/rumble';
import { lockedCommitteeSeats } from './seatPlanningService';
import { assertCanReadSeatPlanning } from './seatPlanningPermissions';

const SeatPlanningCommitteeSeat = schemaBuilder.simpleObject('SeatPlanningCommitteeSeat', {
	fields: (t) => ({
		committeeId: t.id(),
		nationAlpha3Code: t.string(),
		memberNames: t.stringList()
	})
});

const SeatPlanningAssignedRole = schemaBuilder.simpleObject('SeatPlanningAssignedRole', {
	fields: (t) => ({
		roleId: t.id(),
		/** Set when the role is a nation. */
		nationAlpha3Code: t.string({ nullable: true }),
		memberCount: t.int()
	})
});

const SeatPlanningAssignments = schemaBuilder.simpleObject('SeatPlanningAssignments', {
	description:
		'What the seat planning has to respect: committee seats taken by assigned delegates (locked cells) and the size of every delegation assigned to a role.',
	fields: (t) => ({
		committeeSeats: t.field({ type: [SeatPlanningCommitteeSeat] }),
		roles: t.field({ type: [SeatPlanningAssignedRole] })
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * The assignments the seat planning works around. Answered here rather than through the
	 * delegations, since the content lead plans seats without reading the participants: all it
	 * learns is who blocks a seat, and how many members each assigned delegation has.
	 *
	 * Not live: the seat planning never changes assignments, so they only move when the
	 * assignment workflow runs elsewhere, and the page picks that up on its next load.
	 */
	seatPlanningAssignments: t.field({
		type: SeatPlanningAssignments,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanReadSeatPlanning({ ctx, conferenceId: args.conferenceId });

			const delegations = await db.query.delegation.findMany({
				where: { conferenceId: args.conferenceId, assignedRoleId: { isNotNull: true } },
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
	})
}));
