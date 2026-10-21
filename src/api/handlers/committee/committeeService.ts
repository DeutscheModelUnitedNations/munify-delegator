import { db, schema } from '$api/db/db';
import {
	assertCommitteeDeletable,
	assertRegionalBaselineTargets,
	assertSeatsPerDelegationAllowed,
	committeeUpdateData,
	seatRemovalBlockersWhere
} from '$api/services/seatPlanning';
import { tidyRoleApplicationsForRoles } from '$api/services/registration/tidyRoleApplications';
import { apiError } from '$api/services/errors/apiError';
import formatNames from '#lib/helpers/formatNames.js';
import { m } from '#lib/paraglide/messages.js';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { and, eq, inArray } from 'drizzle-orm';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type RegionalBaseline = (typeof schema.regionalBaseline.enumValues)[number];

/** Creates a committee and returns its id. */
export async function createCommittee(data: {
	conferenceId: string;
	name: string;
	abbreviation: string;
	numOfSeatsPerDelegation: number;
}) {
	assertSeatsPerDelegationAllowed(data.numOfSeatsPerDelegation, []);

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
	return created.id;
}

/**
 * Updates a committee the caller may update. `before` is the committee as it was, with the members
 * assigned to it, which bound how far its seats per delegation may go down. Fewer seats per
 * delegation shrink every nation of the committee, so the applications that no longer fit go in
 * the same transaction. Returns whether that happened.
 */
export async function updateCommittee(
	id: string,
	before: {
		conferenceId: string;
		numOfSeatsPerDelegation: number;
		roles: { id: string }[];
		delegationMembers: { delegationId: string }[];
	},
	data: Parameters<typeof committeeUpdateData>[0]
) {
	assertSeatsPerDelegationAllowed(data.numOfSeatsPerDelegation, before.delegationMembers);

	const seatsAfter = data.numOfSeatsPerDelegation ?? before.numOfSeatsPerDelegation;
	const shrunk = seatsAfter < before.numOfSeatsPerDelegation;

	await db.transaction(async (tx) => {
		await tx
			.update(schema.committee)
			.set(committeeUpdateData(data))
			.where(eq(schema.committee.id, id));

		if (shrunk) {
			await tidyRoleApplicationsForRoles(
				before.conferenceId,
				before.roles.map((role) => role.id),
				tx
			);
		}
	});
	return { applicationsTidied: shrunk };
}

/**
 * A nation is offered while a committee seats it, so its role row goes with its last seat - unless
 * a delegation still holds it, which keeps the role (without seats) until the assignment moves it.
 * Wishes for a dropped role go with it. Returns the ids of the dropped roles.
 */
async function dropUnseatedNationRoles(tx: Transaction, roleIds: string[]) {
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
		await tx.delete(schema.conferenceRole).where(inArray(schema.conferenceRole.id, ids));
	}
	return ids;
}

/**
 * Deletes a committee the caller may delete, unless somebody is assigned to it or one of its
 * agenda items has papers, and tidies the applications for its nation roles. Returns the roles
 * that went with it.
 */
export async function deleteCommittee(id: string) {
	return db.transaction(async (tx) => {
		const existing = await tx.query.committee.findFirst({
			where: { id },
			columns: { id: true, conferenceId: true },
			with: {
				roles: { columns: { id: true } },
				delegationMembers: { columns: { id: true } }
			}
		});
		if (!existing) {
			throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
		}
		const papers = await tx.query.paper.findMany({
			where: { agendaItem: { committeeId: existing.id } },
			columns: { id: true }
		});

		assertCommitteeDeletable(existing.delegationMembers.length, papers.length);

		await tx.delete(schema.committee).where(eq(schema.committee.id, existing.id));
		const roleIds = existing.roles.map((role) => role.id);
		const droppedRoleIds = await dropUnseatedNationRoles(tx, roleIds);
		await tidyRoleApplicationsForRoles(existing.conferenceId, roleIds, tx);

		return { droppedRoleIds };
	});
}

/**
 * Gives a nation a seat in a committee or takes it away. The first seat makes the nation one of the
 * conference's roles, the last one ends that (see `dropUnseatedNationRoles`). Taking a seat away is
 * refused while members of the delegation holding the nation are assigned to the committee;
 * applications that no longer fit are dropped. Returns whether a role was created or dropped.
 */
export async function setCommitteeNationSeat(
	committee: { id: string; conferenceId: string },
	nationAlpha3Code: string,
	enabled: boolean
) {
	const nation = await db.query.nation.findFirst({
		where: { alpha3Code: nationAlpha3Code.toLowerCase() },
		columns: { alpha3Code: true }
	});
	if (!nation) throw apiError('NOT_FOUND', m.nationNotFound());

	if (enabled) {
		return db.transaction(async (tx) => {
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
			return { rolesChanged: created.length > 0 };
		});
	}

	const role = await db.query.conferenceRole.findFirst({
		where: { conferenceId: committee.conferenceId, nationAlpha3Code: nation.alpha3Code },
		columns: { id: true }
	});
	// never seated here, so there is nothing to take away
	if (!role) return { rolesChanged: false };

	const dropped = await db.transaction(async (tx) => {
		const blockers = await tx.query.delegationMember.findMany({
			where: seatRemovalBlockersWhere(committee.id, role.id),
			columns: { id: true },
			with: { user: { columns: { givenName: true, familyName: true } } }
		});

		if (blockers.length > 0) {
			throw apiError(
				'CONFLICT',
				m.seatRemovalBlocked({
					members: blockers
						.map(({ user }) => formatNames(user.givenName, user.familyName))
						.join(', ')
				})
			);
		}

		await tx
			.delete(schema.committeeToRole)
			.where(
				and(eq(schema.committeeToRole.a, committee.id), eq(schema.committeeToRole.b, role.id))
			);
		const droppedRoles = await dropUnseatedNationRoles(tx, [role.id]);
		if (droppedRoles.length === 0) {
			await tidyRoleApplicationsForRoles(committee.conferenceId, [role.id], tx);
		}
		return droppedRoles;
	});

	return { rolesChanged: dropped.length > 0 };
}

/** Sets a committee's regional baseline; without new targets the stored ones are kept. */
export async function setCommitteeRegionalBaseline(
	committee: { id: string; regionalBaselineTargets: number[] },
	baseline: RegionalBaseline,
	newTargets: number[] | null | undefined
) {
	const targets = newTargets ?? committee.regionalBaselineTargets;
	assertRegionalBaselineTargets(baseline, targets);

	await db
		.update(schema.committee)
		.set({ regionalBaseline: baseline, regionalBaselineTargets: targets })
		.where(eq(schema.committee.id, committee.id));
}
