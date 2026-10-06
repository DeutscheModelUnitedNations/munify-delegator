import { db } from '$api/db/db';
import { schemaBuilder } from '$api/rumble';
import { SEAT_PLANNING_ROLES, assertTeamRole } from '$api/services/authHelper';
import { lockedCommitteeSeats } from '$api/services/seatPlanning';

const SeatPlanningCommitteeSeat = schemaBuilder.simpleObject('SeatPlanningCommitteeSeat', {
	fields: (t) => ({
		committeeId: t.id(),
		nationAlpha3Code: t.string(),
		memberNames: t.stringList()
	})
});

const SeatPlanningAssignedRole = schemaBuilder.simpleObject('SeatPlanningAssignedRole', {
	fields: (t) => ({
		nationAlpha3Code: t.string({ nullable: true }),
		nonStateActorId: t.id({ nullable: true }),
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
			await assertTeamRole(ctx, args.conferenceId, SEAT_PLANNING_ROLES);

			const delegations = await db.query.delegation.findMany({
				where: {
					conferenceId: args.conferenceId,
					OR: [
						{ assignedNationAlpha3Code: { isNotNull: true } },
						{ assignedNonStateActorId: { isNotNull: true } }
					]
				},
				columns: { assignedNationAlpha3Code: true, assignedNonStateActorId: true },
				with: {
					members: {
						columns: { assignedCommitteeId: true },
						with: { user: { columns: { givenName: true, familyName: true } } }
					}
				}
			});

			return {
				committeeSeats: lockedCommitteeSeats(delegations),
				roles: delegations.map((delegation) => ({
					nationAlpha3Code: delegation.assignedNationAlpha3Code,
					nonStateActorId: delegation.assignedNonStateActorId,
					memberCount: delegation.members.length
				}))
			};
		}
	})
}));
