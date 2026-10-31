import { db, schema, type Transaction } from '#api/db/db';
import {
	assignmentSingleRolePubsub,
	assignmentUnitPubsub,
	calendarTrackPubsub,
	conferenceRolePubsub,
	roleApplicationPubsub,
	singleParticipantPubsub
} from '#api/pubsub';
import { apiError, isUniqueViolationOn } from '#api/services/errors';
import { normalizeRoleApplicationRanks } from '#api/handlers/roleApplication/normalizeRoleApplicationRanks';
import { tidyRoleApplicationsForRoles } from '#api/handlers/roleApplication/tidyRoleApplications';
import { m } from '#lib/paraglide/messages';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import {
	assertCustomRoleDeletable,
	assertCustomRoleSeatsAllowed,
	assertNonStateActorSeatsAllowed,
	assertNonStateActorDeletable,
	nonStateActorUpdateData
} from './plannedRoleRules';

/** Names and abbreviations are unique per conference; turns the database's 23505 into CONFLICT. */
async function withUniqueNameCheck<T>(operation: Promise<T>) {
	try {
		return await operation;
	} catch (error) {
		if (isUniqueViolationOn({ error, column: 'conference_role_conference_id' })) {
			throw apiError({ code: 'CONFLICT', message: m.nonStateActorNotUnique() });
		}
		throw error;
	}
}

/** What deleting roles changed besides the roles, for `announceDeletedRoles`. */
export type DeletedRoles = Awaited<ReturnType<typeof deleteRoles>>;

/**
 * Deletes the roles inside `tx`, with what hangs on them: the applications for them go (closing
 * the gaps they leave in each delegation's ranking), the wishes of single participants and the
 * draft's planned single roles go with them, draft units planning them plan none, and tracks
 * meant for them are for them no longer. Returns the ids to announce once `tx` has committed
 * (`announceDeletedRoles`). Whether a role may go at all is the caller's to check.
 */
export async function deleteRoles({ tx, roleIds }: { tx: Transaction; roleIds: string[] }) {
	const ids = [...new Set(roleIds)];
	const none = {
		roleIds: ids,
		applicationsRemoved: false,
		unitIds: [],
		singleRolesRemoved: false,
		trackIds: [],
		wisherIds: []
	};
	if (ids.length === 0) return none;

	const applications = await tx
		.delete(schema.roleApplication)
		.where(whereRows({ table: schema.roleApplication, filter: { roleId: { in: ids } } }))
		.returning({ delegationId: schema.roleApplication.delegationId });
	for (const delegationId of new Set(applications.map((a) => a.delegationId))) {
		await normalizeRoleApplicationRanks({ delegationId, tx });
	}

	const units = await tx.query.assignmentUnit.findMany({
		where: { roleId: { in: ids } },
		columns: { id: true }
	});
	const singleRoles = await tx.query.assignmentSingleRole.findMany({
		where: { roleId: { in: ids } },
		columns: { id: true }
	});
	const tracks = await tx.query.calendarTrack.findMany({
		where: { conferenceRoles: { id: { in: ids } } },
		columns: { id: true }
	});
	const wishers = await tx.query.singleParticipant.findMany({
		where: { appliedForRoles: { id: { in: ids } } },
		columns: { id: true }
	});

	await tx
		.delete(schema.conferenceRole)
		.where(whereRows({ table: schema.conferenceRole, filter: { id: { in: ids } } }));

	return {
		roleIds: ids,
		applicationsRemoved: applications.length > 0,
		unitIds: units.map((unit) => unit.id),
		singleRolesRemoved: singleRoles.length > 0,
		trackIds: tracks.map((track) => track.id),
		wisherIds: wishers.map((wisher) => wisher.id)
	};
}

/** Announces what `deleteRoles` changed, once its transaction has committed. */
export function announceDeletedRoles(deleted: DeletedRoles) {
	if (deleted.roleIds.length === 0) return;
	conferenceRolePubsub.removed();
	if (deleted.applicationsRemoved) roleApplicationPubsub.removed();
	if (deleted.unitIds.length > 0) assignmentUnitPubsub.updated(deleted.unitIds);
	if (deleted.singleRolesRemoved) assignmentSingleRolePubsub.removed();
	if (deleted.trackIds.length > 0) calendarTrackPubsub.updated(deleted.trackIds);
	if (deleted.wisherIds.length > 0) singleParticipantPubsub.updated(deleted.wisherIds);
}

/** How many single participants hold the role. */
function holdersOf({ tx, roleId }: { tx: Transaction; roleId: string }) {
	return tx.$count(
		schema.singleParticipant,
		whereRows({ table: schema.singleParticipant, filter: { assignedRoleId: roleId } })
	);
}

/** How many members the delegations holding the role have, the most of any one of them. */
async function assignedMembersOf({ tx, roleId }: { tx: Transaction; roleId: string }) {
	const delegations = await tx.query.delegation.findMany({
		where: { assignedRoleId: roleId },
		columns: { memberCount: true }
	});
	return Math.max(0, ...delegations.map((delegation) => delegation.memberCount));
}

/** Creates a non-state actor and returns its id. */
export async function createNonStateActor(data: {
	conferenceId: string;
	name: string;
	abbreviation: string;
	description: string;
	fontAwesomeIcon?: string | null;
	seatAmount: number;
}) {
	const created = await withUniqueNameCheck(
		db
			.insert(schema.conferenceRole)
			.values({
				conferenceId: data.conferenceId,
				kind: 'NON_STATE_ACTOR',
				name: data.name,
				abbreviation: data.abbreviation,
				description: data.description,
				fontAwesomeIcon: data.fontAwesomeIcon || null,
				seatAmount: data.seatAmount
			})
			.returning({ id: schema.conferenceRole.id })
			.then(assertFirstEntryExists)
	);
	conferenceRolePubsub.created();
	return created.id;
}

/**
 * Changes the given fields of a non-state actor (`nonStateActorUpdateData`). Lowering the seats
 * below the members of the delegation assigned to it is refused (CONFLICT); the applications that
 * no longer fit are dropped in the same transaction.
 */
export async function updateNonStateActor({
	before,
	args
}: {
	before: { id: string; conferenceId: string; seatAmount: number | null };
	args: Parameters<typeof nonStateActorUpdateData>[0];
}) {
	const data = nonStateActorUpdateData(args);
	const seatsBefore = before.seatAmount ?? 0;
	const shrunk = (data.seatAmount ?? seatsBefore) < seatsBefore;

	await withUniqueNameCheck(
		db.transaction(async (tx) => {
			if (shrunk) {
				assertNonStateActorSeatsAllowed({
					seatAmount: data.seatAmount,
					assignedMembers: await assignedMembersOf({ tx, roleId: before.id })
				});
			}
			await tx
				.update(schema.conferenceRole)
				.set(data)
				.where(whereRows({ table: schema.conferenceRole, filter: { id: before.id } }));
			if (shrunk) {
				await tidyRoleApplicationsForRoles({
					conferenceId: before.conferenceId,
					roleIds: [before.id],
					tx
				});
			}
		})
	);
	conferenceRolePubsub.updated(before.id);
}

/**
 * Deletes a non-state actor unless a delegation is assigned to it, with the applications for it
 * and whatever else hangs on it (`deleteRoles`).
 */
export async function deleteNonStateActor(id: string) {
	const deleted = await db.transaction(async (tx) => {
		const role = await tx.query.conferenceRole.findFirst({
			where: { id, kind: 'NON_STATE_ACTOR' },
			columns: { id: true },
			with: { assignedDelegations: { columns: { id: true } } }
		});
		if (!role) throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
		assertNonStateActorDeletable(role.assignedDelegations.length);
		return deleteRoles({ tx, roleIds: [role.id] });
	});
	announceDeletedRoles(deleted);
}

/** Creates a custom role for single participants (the press, …) and returns its id. */
export async function createCustomRole(data: {
	conferenceId: string;
	name: string;
	description?: string | null;
	fontAwesomeIcon?: string | null;
	seatAmount: number;
}) {
	const created = await withUniqueNameCheck(
		db
			.insert(schema.conferenceRole)
			.values({
				conferenceId: data.conferenceId,
				kind: 'CUSTOM',
				name: data.name,
				description: data.description || null,
				fontAwesomeIcon: data.fontAwesomeIcon || null,
				seatAmount: data.seatAmount
			})
			.returning({ id: schema.conferenceRole.id })
			.then(assertFirstEntryExists)
	);
	conferenceRolePubsub.created();
	return created.id;
}

/**
 * Changes the given fields of a custom role; an empty name keeps the old one, `null` clears the
 * description and icon. Its seats may not drop below the people already holding it, counted in
 * the same transaction so an assignment cannot slip in between.
 */
export async function updateCustomRole({
	id,
	data
}: {
	id: string;
	data: {
		name?: string | null;
		description?: string | null;
		fontAwesomeIcon?: string | null;
		seatAmount?: number | null;
	};
}) {
	await withUniqueNameCheck(
		db.transaction(async (tx) => {
			if (data.seatAmount != null) {
				assertCustomRoleSeatsAllowed({
					seatAmount: data.seatAmount,
					holders: await holdersOf({ tx, roleId: id })
				});
			}
			await tx
				.update(schema.conferenceRole)
				.set({
					name: data.name || undefined,
					description: data.description,
					fontAwesomeIcon: data.fontAwesomeIcon,
					seatAmount: data.seatAmount ?? undefined
				})
				.where(whereRows({ table: schema.conferenceRole, filter: { id } }));
		})
	);
	conferenceRolePubsub.updated(id);
}

/**
 * Deletes a custom role unless somebody holds it; the wishes for it and whatever else hangs on it
 * go with it (`deleteRoles`).
 */
export async function deleteCustomRole(id: string) {
	const deleted = await db.transaction(async (tx) => {
		assertCustomRoleDeletable(await holdersOf({ tx, roleId: id }));
		return deleteRoles({ tx, roleIds: [id] });
	});
	announceDeletedRoles(deleted);
}
