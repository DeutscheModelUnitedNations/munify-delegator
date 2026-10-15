import { db, schema } from '$api/db/db';
import { isUniqueViolationOn } from '$api/services/errors/uniqueViolation';
import { normalizeRoleApplicationRanks } from '$api/services/registration/normalizeRoleApplicationRanks';
import { tidyRoleApplicationsForRoles } from '$api/services/registration/tidyRoleApplications';
import {
	assertNonStateActorDeletable,
	assertSeatsPerDelegationAllowed
} from '$api/services/seatPlanning';
import { apiError } from '$api/services/errors/apiError';
import { m } from '$lib/paraglide/messages';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';

/** Names and abbreviations are unique per conference; the database says so as a 23505. */
async function withUniqueNameCheck<T>(operation: Promise<T>) {
	try {
		return await operation;
	} catch (error) {
		if (isUniqueViolationOn(error, 'conference_role_conference_id')) {
			throw apiError('CONFLICT', m.nonStateActorNotUnique());
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
	assertSeatsPerDelegationAllowed(data.seatAmount, []);

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
export async function updateNonStateActor(
	before: { id: string; conferenceId: string; seatAmount: number | null },
	data: Partial<typeof schema.conferenceRole.$inferInsert>
) {
	const seatsBefore = before.seatAmount ?? 0;
	const shrunk = (data.seatAmount ?? seatsBefore) < seatsBefore;

	await db.transaction(async (tx) => {
		await withUniqueNameCheck(
			tx.update(schema.conferenceRole).set(data).where(eq(schema.conferenceRole.id, before.id))
		);
		if (shrunk) await tidyRoleApplicationsForRoles(before.conferenceId, [before.id], tx);
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
			throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
		}

		assertNonStateActorDeletable(existing.assignedDelegations.length);

		// applications for it go with it, closing the gaps they leave in the rankings
		const applications = await tx
			.delete(schema.roleApplication)
			.where(eq(schema.roleApplication.roleId, existing.id))
			.returning({ delegationId: schema.roleApplication.delegationId });
		for (const delegationId of new Set(applications.map((a) => a.delegationId))) {
			await normalizeRoleApplicationRanks(delegationId, tx);
		}

		await tx.delete(schema.conferenceRole).where(eq(schema.conferenceRole.id, existing.id));
	});
}
