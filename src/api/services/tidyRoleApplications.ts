import { db, schema } from '$api/db/db';
import { and, eq, inArray } from 'drizzle-orm';

/**
 * Drizzle port of `removeTooSmallRoleApplications.ts`.
 *
 * A delegation's size can change after it has applied for roles. This drops any application for a
 * nation or non-state actor that can no longer seat everyone: for a nation, the seats are summed
 * across every committee that nation sits in; for a non-state actor it is its own seat count.
 *
 * The Prisma original stays until the legacy resolvers are deleted in Phase F.
 */
export async function tidyRoleApplications(delegationId: string) {
	const delegation = await db.query.delegation.findFirst({
		where: { id: delegationId },
		columns: { id: true, conferenceId: true },
		with: {
			members: { columns: { id: true } },
			appliedForRoles: { columns: { id: true, nationId: true, nonStateActorId: true } }
		}
	});
	if (!delegation) return;

	const memberCount = delegation.members.length;

	const conference = await db.query.conference.findFirst({
		where: { id: delegation.conferenceId },
		columns: { id: true },
		with: {
			committees: { columns: { numOfSeatsPerDelegation: true }, with: { nations: true } },
			nonStateActors: { columns: { id: true, seatAmount: true } }
		}
	});
	if (!conference) return;

	const nationIds = delegation.appliedForRoles
		.map((role) => role.nationId)
		.filter((code): code is string => code !== null)
		.filter((code) => {
			const seats = conference.committees
				.filter((committee) => committee.nations.some((nation) => nation.alpha3Code === code))
				.reduce((total, committee) => total + committee.numOfSeatsPerDelegation, 0);
			return memberCount > seats;
		});

	if (nationIds.length > 0) {
		await db
			.delete(schema.roleApplication)
			.where(
				and(
					eq(schema.roleApplication.delegationId, delegation.id),
					inArray(schema.roleApplication.nationId, nationIds)
				)
			);
	}

	const nonStateActorIds = delegation.appliedForRoles
		.map((role) => role.nonStateActorId)
		.filter((id): id is string => id !== null)
		.filter((id) => {
			const actor = conference.nonStateActors.find((a) => a.id === id);
			if (!actor) return false;
			return memberCount > actor.seatAmount;
		});

	if (nonStateActorIds.length > 0) {
		await db
			.delete(schema.roleApplication)
			.where(
				and(
					eq(schema.roleApplication.delegationId, delegation.id),
					inArray(schema.roleApplication.nonStateActorId, nonStateActorIds)
				)
			);
	}
}
