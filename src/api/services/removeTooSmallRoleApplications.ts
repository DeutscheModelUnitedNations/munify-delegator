import { db } from '$db/db';
import type { Prisma } from '@prisma/client';

/**
 * In case a delegation changes during its existence, we need to check some state throughout the app.
 * E.g. remove applications for nations/nsa which do not provide enought seats to fit all the delegates.
 */
export async function tidyRoleApplications(delegationWhere: Prisma.DelegationWhereUniqueInput) {
	const delegation = await db.delegation.findUniqueOrThrow({
		where: delegationWhere,
		select: {
			id: true,
			members: true,
			conferenceId: true,
			appliedForRoles: {
				select: {
					nation: true,
					nonStateActor: true
				}
			}
		}
	});

	const numDelegationMembers = delegation.members.length;

	const conference =
		(await db.conference.findUniqueOrThrow({
			where: {
				id: delegation.conferenceId
			},
			select: {
				committees: {
					select: {
						nations: true,
						numOfSeatsPerDelegation: true
					}
				},
				nonStateActors: {
					select: {
						id: true,
						seatAmount: true
					}
				}
			}
		})) ?? [];

	// Remove Nations
	const nationIds = delegation.appliedForRoles
		.map((role) => role.nation?.alpha3Code)
		.filter((code) => code !== undefined)
		.filter((code) => {
			const committees = conference.committees.filter((committee) =>
				committee.nations.some((nation) => nation.alpha3Code === code)
			);
			const numOfSeatsPerDelegation = committees.reduce(
				(acc, committee) => acc + committee.numOfSeatsPerDelegation,
				0
			);
			return numDelegationMembers > numOfSeatsPerDelegation;
		});

	await db.roleApplication.deleteMany({
		where: {
			delegationId: delegation.id,
			nationId: {
				in: nationIds
			}
		}
	});

	// Remove NonStateActors
	const nonStateActorIds = delegation.appliedForRoles
		.map((role) => role.nonStateActor?.id)
		.filter((id) => id !== undefined)
		.filter((id) => {
			const nonStateActor = conference.nonStateActors.find((actor) => actor.id === id);
			if (!nonStateActor) return false;
			return numDelegationMembers > nonStateActor?.seatAmount;
		});

	await db.roleApplication.deleteMany({
		where: {
			delegationId: delegation.id,
			nonStateActorId: {
				in: nonStateActorIds
			}
		}
	});
}
