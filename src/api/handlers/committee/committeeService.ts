import { db, schema, type Transaction } from '#api/db/db';
import {
	committeeAgendaItemPubsub,
	committeePubsub,
	conferenceRolePubsub,
	resolutionPubsub
} from '#api/pubsub';
import {
	assertCommitteeDeletable,
	assertRegionalBaselineTargets,
	assertSeatsPerDelegationAllowed,
	committeeUpdateData
} from '#api/handlers/seatPlanning/seatPlanningService';
import { tidyRoleApplicationsForRoles } from '#api/handlers/roleApplication/tidyRoleApplications';
import { apiError } from '#api/services/errors';
import formatNames from '#lib/helpers/formatNames';
import { m } from '#lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';

type RegionalBaseline = (typeof schema.regionalBaseline.enumValues)[number];

/** Creates a committee and returns its id. */
export async function createCommittee(data: {
	conferenceId: string;
	name: string;
	abbreviation: string;
	numOfSeatsPerDelegation: number;
}) {
	const created = await db
		.insert(schema.committee)
		.values({
			conferenceId: data.conferenceId,
			name: data.name,
			abbreviation: data.abbreviation,
			numOfSeatsPerDelegation: data.numOfSeatsPerDelegation
		})
		.returning({ id: schema.committee.id })
		.then(assertFirstEntryExists);
	committeePubsub.created();
	return created.id;
}

/**
 * Updates a committee the caller may update. `before` is the committee as it was, with the members
 * assigned to it, which bound how far its seats per delegation may go down. Fewer seats per
 * delegation shrink every nation of the committee, so the applications that no longer fit go in
 * the same transaction.
 */
export async function updateCommittee({
	id,
	before,
	data
}: {
	id: string;
	before: {
		conferenceId: string;
		numOfSeatsPerDelegation: number;
		roles: { id: string }[];
		delegationMembers: { delegationId: string }[];
	};
	data: Parameters<typeof committeeUpdateData>[0];
}) {
	assertSeatsPerDelegationAllowed({
		numOfSeatsPerDelegation: data.numOfSeatsPerDelegation,
		assignedMembers: before.delegationMembers
	});

	const seatsAfter = data.numOfSeatsPerDelegation ?? before.numOfSeatsPerDelegation;
	const shrunk = seatsAfter < before.numOfSeatsPerDelegation;

	await db.transaction(async (tx) => {
		await tx
			.update(schema.committee)
			.set(committeeUpdateData(data))
			.where(whereRows({ table: schema.committee, filter: { id } }));

		if (shrunk) {
			await tidyRoleApplicationsForRoles({
				conferenceId: before.conferenceId,
				roleIds: before.roles.map((role) => role.id),
				tx
			});
		}
	});
	committeePubsub.updated(id);
}

/**
 * A nation is offered while a committee seats it, so its role row goes with its last seat - unless
 * a delegation still holds it, which keeps the role (without seats) until the assignment moves it.
 * Wishes for a dropped role go with it. Returns the ids of the dropped roles.
 */
async function dropUnseatedNationRoles({ tx, roleIds }: { tx: Transaction; roleIds: string[] }) {
	if (roleIds.length === 0) return [];
	const unseated = await tx.query.conferenceRole.findMany({
		where: {
			id: { in: roleIds },
			kind: 'NATION',
			NOT: { OR: [{ committees: true }, { assignedDelegations: true }] }
		},
		columns: { id: true }
	});
	const ids = unseated.map((role) => role.id);
	if (ids.length > 0) {
		await tx
			.delete(schema.conferenceRole)
			.where(whereRows({ table: schema.conferenceRole, filter: { id: { in: ids } } }));
		conferenceRolePubsub.removed();
	}
	return ids;
}

/**
 * Deletes a committee the caller may delete, unless somebody is assigned to it or one of its
 * agenda items has papers, and tidies the applications for its nation roles.
 */
export async function deleteCommittee(id: string) {
	const resolutionIds = await db.transaction(async (tx) => {
		const existing = await tx.query.committee.findFirst({
			where: { id },
			columns: { id: true, conferenceId: true },
			with: {
				roles: { columns: { id: true } },
				delegationMembers: { columns: { id: true } },
				resolutions: { columns: { id: true } }
			}
		});
		if (!existing) {
			throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
		}
		const papers = await tx.query.paper.findMany({
			where: { agendaItem: { committeeId: existing.id } },
			columns: { id: true }
		});

		assertCommitteeDeletable({
			assignedMembers: existing.delegationMembers.length,
			papers: papers.length
		});

		await tx
			.delete(schema.committee)
			.where(whereRows({ table: schema.committee, filter: { id: existing.id } }));
		const roleIds = existing.roles.map((role) => role.id);
		await dropUnseatedNationRoles({ tx, roleIds });
		await tidyRoleApplicationsForRoles({ conferenceId: existing.conferenceId, roleIds, tx });
		return existing.resolutions.map((resolution) => resolution.id);
	});
	committeePubsub.removed();
	// its agenda items go with it, its resolutions lose their committee
	committeeAgendaItemPubsub.removed();
	if (resolutionIds.length > 0) resolutionPubsub.updated(resolutionIds);
}

/**
 * Gives a nation a seat in a committee or takes it away. The first seat makes the nation one of the
 * conference's roles, the last one ends that (see `dropUnseatedNationRoles`). Taking a seat away is
 * refused while members of the delegation holding the nation are assigned to the committee;
 * applications that no longer fit are dropped.
 */
export async function setCommitteeNationSeat({
	committee,
	nationAlpha3Code,
	enabled
}: {
	committee: { id: string; conferenceId: string };
	nationAlpha3Code: string;
	enabled: boolean;
}) {
	const nation = await db.query.nation.findFirst({
		where: { alpha3Code: nationAlpha3Code.toLowerCase() },
		columns: { alpha3Code: true }
	});
	if (!nation) throw apiError({ code: 'NOT_FOUND', message: m.nationNotFound() });

	if (enabled) {
		const roleCreated = await db.transaction(async (tx) => {
			const created = await tx
				.insert(schema.conferenceRole)
				.values({
					conferenceId: committee.conferenceId,
					kind: 'NATION',
					nationAlpha3Code: nation.alpha3Code
				})
				.onConflictDoNothing()
				.returning({ id: schema.conferenceRole.id });
			const role = await tx.query.conferenceRole
				.findFirst({
					where: { conferenceId: committee.conferenceId, nationAlpha3Code: nation.alpha3Code },
					columns: { id: true }
				})
				.then(assertFindFirstExists);
			await tx
				.insert(schema.committeeToRole)
				.values({ a: committee.id, b: role.id })
				.onConflictDoNothing();
			return created.length > 0;
		});
		if (roleCreated) conferenceRolePubsub.created();
		committeePubsub.updated(committee.id);
		return;
	}

	const role = await db.query.conferenceRole.findFirst({
		where: { conferenceId: committee.conferenceId, nationAlpha3Code: nation.alpha3Code },
		columns: { id: true }
	});
	// never seated here, so there is nothing to take away
	if (!role) return;

	await db.transaction(async (tx) => {
		// members of the nation's delegation sitting in exactly this committee would lose their seat
		const blockers = await tx.query.delegationMember.findMany({
			where: { assignedCommitteeId: committee.id, delegation: { assignedRoleId: role.id } },
			columns: { id: true },
			with: { user: { columns: { givenName: true, familyName: true } } }
		});

		if (blockers.length > 0) {
			throw apiError({
				code: 'CONFLICT',
				message: m.seatRemovalBlocked({
					members: blockers
						.map(({ user }) =>
							formatNames({ givenName: user.givenName, familyName: user.familyName })
						)
						.join(', ')
				})
			});
		}

		await tx
			.delete(schema.committeeToRole)
			.where(whereRows({ table: schema.committeeToRole, filter: { a: committee.id, b: role.id } }));
		const droppedRoles = await dropUnseatedNationRoles({ tx, roleIds: [role.id] });
		if (droppedRoles.length === 0) {
			await tidyRoleApplicationsForRoles({
				conferenceId: committee.conferenceId,
				roleIds: [role.id],
				tx
			});
		}
	});
	committeePubsub.updated(committee.id);
}

/** Sets a committee's regional baseline; without new targets the stored ones are kept. */
export async function setCommitteeRegionalBaseline({
	committee,
	baseline,
	newTargets
}: {
	committee: { id: string; regionalBaselineTargets: number[] };
	baseline: RegionalBaseline;
	newTargets: number[] | null | undefined;
}) {
	const targets = newTargets ?? committee.regionalBaselineTargets;
	assertRegionalBaselineTargets({ baseline, targets });

	await db
		.update(schema.committee)
		.set({ regionalBaseline: baseline, regionalBaselineTargets: targets })
		.where(whereRows({ table: schema.committee, filter: { id: committee.id } }));
	committeePubsub.updated(committee.id);
}
