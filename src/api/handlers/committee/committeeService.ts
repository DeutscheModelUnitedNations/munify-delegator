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
import formatNames from '$lib/helpers/formatNames';
import { m } from '$lib/paraglide/messages';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { and, eq } from 'drizzle-orm';

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
 * assigned to it, which bound how far its seats per delegation may go down.
 */
export async function updateCommittee(
	id: string,
	before: { delegationMembers: { delegationId: string }[] },
	data: Parameters<typeof committeeUpdateData>[0]
) {
	assertSeatsPerDelegationAllowed(data.numOfSeatsPerDelegation, before.delegationMembers);

	await db
		.update(schema.committee)
		.set(committeeUpdateData(data))
		.where(eq(schema.committee.id, id));
}

/**
 * Deletes a committee the caller may delete, unless somebody is assigned to it or one of its
 * agenda items has papers. Returns its conference and nations, whose applications need tidying.
 */
export async function deleteCommittee(id: string) {
	return db.transaction(async (tx) => {
		const existing = await tx.query.committee.findFirst({
			where: { id },
			columns: { id: true, conferenceId: true },
			with: {
				nations: { columns: { alpha3Code: true } },
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

		return {
			conferenceId: existing.conferenceId,
			nationAlpha3Codes: existing.nations.map((nation) => nation.alpha3Code)
		};
	});
}

/**
 * Gives a nation a seat in a committee or takes it away. Taking it away is refused while members
 * of the delegation holding the nation are assigned to the committee; applications that no longer
 * fit are dropped.
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
		await db
			.insert(schema.committeeToNation)
			.values({ a: committee.id, b: nation.alpha3Code })
			.onConflictDoNothing();
		return;
	}

	await db.transaction(async (tx) => {
		const blockers = await tx.query.delegationMember.findMany({
			where: seatRemovalBlockersWhere(committee.id, nation.alpha3Code),
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
			.delete(schema.committeeToNation)
			.where(
				and(
					eq(schema.committeeToNation.a, committee.id),
					eq(schema.committeeToNation.b, nation.alpha3Code)
				)
			);
	});

	await tidyRoleApplicationsForRoles(committee.conferenceId, {
		nationAlpha3Codes: [nation.alpha3Code]
	});
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
