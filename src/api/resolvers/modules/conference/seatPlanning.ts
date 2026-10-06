import { builder } from '../../builder';
import { db } from '$db/db';
import { lockedCommitteeSeats } from '$api/services/seatPlanning';

const SeatPlanningCommitteeSeat = builder.simpleObject('SeatPlanningCommitteeSeat', {
	fields: (t) => ({
		committeeId: t.id(),
		nationAlpha3Code: t.string(),
		memberNames: t.stringList()
	})
});

const SeatPlanningAssignedRole = builder.simpleObject('SeatPlanningAssignedRole', {
	fields: (t) => ({
		nationAlpha3Code: t.string({ nullable: true }),
		nonStateActorId: t.id({ nullable: true }),
		memberCount: t.int()
	})
});

const SeatPlanningAssignments = builder.simpleObject('SeatPlanningAssignments', {
	description:
		'What the seat planning tool has to respect: committee seats taken by assigned delegates (locked cells) and the size of every delegation assigned to a role.',
	fields: (t) => ({
		committeeSeats: t.field({ type: [SeatPlanningCommitteeSeat] }),
		roles: t.field({ type: [SeatPlanningAssignedRole] })
	})
});

builder.prismaObjectField('Conference', 'seatPlanningAssignments', (t) =>
	t.field({
		type: SeatPlanningAssignments,
		resolve: async (conference, _args, ctx) => {
			await db.conference.findUniqueOrThrow({
				where: {
					id: conference.id,
					AND: [ctx.permissions.allowDatabaseAccessTo('planSeats').Conference]
				},
				select: { id: true }
			});

			const delegations = await db.delegation.findMany({
				where: {
					conferenceId: conference.id,
					OR: [
						{ assignedNationAlpha3Code: { not: null } },
						{ assignedNonStateActorId: { not: null } }
					]
				},
				select: {
					assignedNationAlpha3Code: true,
					assignedNonStateActorId: true,
					members: {
						select: {
							assignedCommitteeId: true,
							user: { select: { given_name: true, family_name: true } }
						}
					}
				}
			});

			const committeeSeats = lockedCommitteeSeats(delegations);

			const roles = delegations.map((delegation) => ({
				nationAlpha3Code: delegation.assignedNationAlpha3Code,
				nonStateActorId: delegation.assignedNonStateActorId,
				memberCount: delegation.members.length
			}));

			return { committeeSeats, roles };
		}
	})
);
