import { db, schema } from '#api/db/db';
import { apiError, isUniqueViolationOn } from '#api/services/errors';
import { normalizeRoleApplicationRanks } from '#api/handlers/roleApplication/normalizeRoleApplicationRanks';
import { tidyRoleApplicationsForRoles } from '#api/handlers/roleApplication/tidyRoleApplications';
import {
	assertNonStateActorDeletable,
	assertSeatsPerDelegationAllowed
} from '#api/handlers/seatPlanning/seatPlanningService';
import { m } from '#lib/paraglide/messages';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';

/** Names and abbreviations are unique per conference; the database says so as a 23505. */
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

/** Creates a non-state actor and returns its id. */
export async function createNonStateActor(data: {
	conferenceId: string;
	name: string;
	abbreviation: string;
	description: string;
	fontAwesomeIcon?: string | null;
	seatAmount: number;
}) {
	assertSeatsPerDelegationAllowed({
		numOfSeatsPerDelegation: data.seatAmount,
		assignedMembers: []
	});

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
	return created.id;
}

/**
 * Writes the update data of `nonStateActorUpdateData` to a non-state actor. Lowering the seats is
 * allowed, but the applications that no longer fit are dropped in the same transaction. Returns
 * whether that happened.
 */
export async function updateNonStateActor({
	before,
	data
}: {
	before: { id: string; conferenceId: string; seatAmount: number | null };
	data: Partial<typeof schema.conferenceRole.$inferInsert>;
}) {
	const seatsBefore = before.seatAmount ?? 0;
	const shrunk = (data.seatAmount ?? seatsBefore) < seatsBefore;

	await db.transaction(async (tx) => {
		await withUniqueNameCheck(
			tx
				.update(schema.conferenceRole)
				.set(data)
				.where(whereRows({ table: schema.conferenceRole, filter: { id: before.id } }))
		);
		if (shrunk)
			await tidyRoleApplicationsForRoles({
				conferenceId: before.conferenceId,
				roleIds: [before.id],
				tx
			});
	});
	return { applicationsTidied: shrunk };
}

/**
 * Deletes a non-state actor unless a delegation is assigned to it, together with the applications
 * for it.
 */
export async function deleteNonStateActor(id: string) {
	await db.transaction(async (tx) => {
		const existing = await tx.query.conferenceRole.findFirst({
			where: { id, kind: 'NON_STATE_ACTOR' },
			columns: { id: true },
			with: { assignedDelegations: { columns: { id: true } } }
		});
		if (!existing) {
			throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
		}

		assertNonStateActorDeletable(existing.assignedDelegations.length);

		// applications for it go with it, closing the gaps they leave in the rankings
		const applications = await tx
			.delete(schema.roleApplication)
			.where(whereRows({ table: schema.roleApplication, filter: { roleId: existing.id } }))
			.returning({ delegationId: schema.roleApplication.delegationId });
		for (const delegationId of new Set(applications.map((a) => a.delegationId))) {
			await normalizeRoleApplicationRanks({ delegationId, tx });
		}

		await tx
			.delete(schema.conferenceRole)
			.where(whereRows({ table: schema.conferenceRole, filter: { id: existing.id } }));
	});
}

/** Creates a custom role for single participants (the press, …) and returns its id. */
export async function createCustomRole(data: {
	conferenceId: string;
	name: string;
	description?: string | null;
	fontAwesomeIcon?: string | null;
	seatAmount: number;
}) {
	if (data.seatAmount < 1)
		throw apiError({ code: 'INVALID_INPUT', message: m.customRoleSeatsRange() });
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
	return created.id;
}

/**
 * Updates a custom role. Its seats may not drop below the people already holding it: unlike a
 * non-state actor's applications, an assignment is not something to drop quietly.
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
	if (data.seatAmount !== undefined && data.seatAmount !== null) {
		if (data.seatAmount < 1)
			throw apiError({ code: 'INVALID_INPUT', message: m.customRoleSeatsRange() });
		const holders = await db.$count(
			schema.singleParticipant,
			whereRows({ table: schema.singleParticipant, filter: { assignedRoleId: id } })
		);
		if (data.seatAmount < holders) {
			throw apiError({
				code: 'CONFLICT',
				message: m.customRoleSeatsBelowAssigned({ assigned: holders })
			});
		}
	}
	await withUniqueNameCheck(
		db
			.update(schema.conferenceRole)
			.set({
				name: data.name || undefined,
				description: data.description,
				fontAwesomeIcon: data.fontAwesomeIcon,
				seatAmount: data.seatAmount ?? undefined
			})
			.where(whereRows({ table: schema.conferenceRole, filter: { id } }))
	);
}

/** Deletes a custom role unless somebody holds it; the wishes for it go with it. */
export async function deleteCustomRole(id: string) {
	const holders = await db.$count(
		schema.singleParticipant,
		whereRows({ table: schema.singleParticipant, filter: { assignedRoleId: id } })
	);
	if (holders > 0) throw apiError({ code: 'CONFLICT', message: m.customRoleStillAssigned() });
	await db
		.delete(schema.conferenceRole)
		.where(whereRows({ table: schema.conferenceRole, filter: { id } }));
}
