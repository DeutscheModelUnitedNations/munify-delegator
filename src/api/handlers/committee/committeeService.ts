import { db, schema, type Transaction } from '#api/db/db';
import {
	calendarTrackPubsub,
	committeeAgendaItemPubsub,
	committeePubsub,
	conferenceRolePubsub,
	resolutionPubsub
} from '#api/pubsub';
import { tidyRoleApplicationsForRoles } from '#api/handlers/roleApplication/tidyRoleApplications';
import {
	announceDeletedRoles,
	deleteRoles,
	type DeletedRoles
} from '#api/handlers/conferenceRole/conferenceRoleService';
import { apiError } from '#api/services/errors';
import formatNames from '#lib/helpers/formatNames';
import { m } from '#lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import {
	assertCommitteeDeletable,
	assertSeatsPerDelegationAllowed,
	assertStoredTargetsUsable,
	committeeUpdateData
} from './committeeRules';

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
 * Changes the given fields of a committee (`committeeUpdateData`). `before` is the committee as it
 * was, with the members assigned to it, which bound how far its seats per delegation may go down.
 * Fewer seats per delegation shrink every nation of the committee, so the applications that no
 * longer fit go in the same transaction.
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
 * What hangs on a dropped role goes with it (`deleteRoles`); returns what to announce.
 */
async function dropUnseatedNationRoles({ tx, roleIds }: { tx: Transaction; roleIds: string[] }) {
	const unseated =
		roleIds.length === 0
			? []
			: await tx.query.conferenceRole.findMany({
					where: {
						id: { in: roleIds },
						kind: 'NATION',
						NOT: { OR: [{ committees: true }, { assignedDelegations: true }] }
					},
					columns: { id: true }
				});
	return deleteRoles({ tx, roleIds: unseated.map((role) => role.id) });
}

/** The roles of `roleIds` that `deleted` did not delete. */
function keptRoles({ roleIds, deleted }: { roleIds: string[]; deleted: DeletedRoles }) {
	return roleIds.filter((id) => !deleted.roleIds.includes(id));
}

/**
 * Deletes a committee unless somebody is assigned to it or one of its agenda items has papers
 * (`assertCommitteeDeletable`). Its agenda items go with it, its resolutions lose it, nation roles
 * it seated alone go (`dropUnseatedNationRoles`), and the applications for the others are tidied.
 */
export async function deleteCommittee(id: string) {
	const { resolutionIds, trackIds, roleIds, deleted } = await db.transaction(async (tx) => {
		const existing = await tx.query.committee.findFirst({
			where: { id },
			columns: { id: true, conferenceId: true },
			with: {
				roles: { columns: { id: true } },
				delegationMembers: { columns: { id: true } },
				resolutions: { columns: { id: true } },
				calendarTracks: { columns: { id: true } }
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
		const deleted = await dropUnseatedNationRoles({ tx, roleIds });
		await tidyRoleApplicationsForRoles({
			conferenceId: existing.conferenceId,
			roleIds: keptRoles({ roleIds, deleted }),
			tx
		});
		return {
			resolutionIds: existing.resolutions.map((resolution) => resolution.id),
			trackIds: existing.calendarTracks.map((track) => track.id),
			roleIds,
			deleted
		};
	});
	committeePubsub.removed();
	committeeAgendaItemPubsub.removed();
	if (resolutionIds.length > 0) resolutionPubsub.updated(resolutionIds);
	// the tracks meant for it and the roles it seated are without it now
	if (trackIds.length > 0) calendarTrackPubsub.updated(trackIds);
	const kept = keptRoles({ roleIds, deleted });
	if (kept.length > 0) conferenceRolePubsub.updated(kept);
	announceDeletedRoles(deleted);
}

/** The nation with this alpha-3 code (any case); NOT_FOUND for none. */
async function findNation(alpha3Code: string) {
	const nation = await db.query.nation.findFirst({
		where: { alpha3Code: alpha3Code.toLowerCase() },
		columns: { alpha3Code: true }
	});
	if (!nation) throw apiError({ code: 'NOT_FOUND', message: m.nationNotFound() });
	return nation;
}

/** Gives the nation a seat in the committee, making it one of the conference's roles first. */
async function seatNation({
	committee,
	nationAlpha3Code
}: {
	committee: { id: string; conferenceId: string };
	nationAlpha3Code: string;
}) {
	const { roleId, roleCreated } = await db.transaction(async (tx) => {
		const created = await tx
			.insert(schema.conferenceRole)
			.values({ conferenceId: committee.conferenceId, kind: 'NATION', nationAlpha3Code })
			.onConflictDoNothing()
			.returning({ id: schema.conferenceRole.id });
		const role = await tx.query.conferenceRole
			.findFirst({
				where: { conferenceId: committee.conferenceId, nationAlpha3Code },
				columns: { id: true }
			})
			.then(assertFindFirstExists);
		await tx
			.insert(schema.committeeToRole)
			.values({ a: committee.id, b: role.id })
			.onConflictDoNothing();
		return { roleId: role.id, roleCreated: created.length > 0 };
	});
	committeePubsub.updated(committee.id);
	if (roleCreated) conferenceRolePubsub.created();
	else conferenceRolePubsub.updated(roleId);
}

/**
 * Takes the nation's seat in the committee away, refused (CONFLICT) while members of the
 * delegation holding the nation are assigned to the committee. Its last seat ends the nation's
 * role (`dropUnseatedNationRoles`); otherwise the applications that no longer fit go.
 */
async function unseatNation({
	committee,
	nationAlpha3Code
}: {
	committee: { id: string; conferenceId: string };
	nationAlpha3Code: string;
}) {
	const role = await db.query.conferenceRole.findFirst({
		where: { conferenceId: committee.conferenceId, nationAlpha3Code },
		columns: { id: true }
	});
	// never seated here, so there is nothing to take away
	if (!role) return;

	const deleted = await db.transaction(async (tx) => {
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
		const deleted = await dropUnseatedNationRoles({ tx, roleIds: [role.id] });
		if (deleted.roleIds.length === 0) {
			await tidyRoleApplicationsForRoles({
				conferenceId: committee.conferenceId,
				roleIds: [role.id],
				tx
			});
		}
		return deleted;
	});
	committeePubsub.updated(committee.id);
	if (deleted.roleIds.length === 0) conferenceRolePubsub.updated(role.id);
	announceDeletedRoles(deleted);
}

/**
 * Gives a nation a seat in a committee or takes it away (`seatNation` / `unseatNation`); refuses
 * (NOT_FOUND) a nation that does not exist.
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
	const nation = await findNation(nationAlpha3Code);
	if (enabled) await seatNation({ committee, nationAlpha3Code: nation.alpha3Code });
	else await unseatNation({ committee, nationAlpha3Code: nation.alpha3Code });
}

/**
 * Sets a committee's regional baseline. Given targets were checked with the arguments
 * (`regionalBaselineArgsSchema`); without them the stored ones are kept, and have to suit the
 * baseline too.
 */
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
	if (!newTargets) assertStoredTargetsUsable({ baseline, targets });

	await db
		.update(schema.committee)
		.set({ regionalBaseline: baseline, regionalBaselineTargets: targets })
		.where(whereRows({ table: schema.committee, filter: { id: committee.id } }));
	committeePubsub.updated(committee.id);
}
