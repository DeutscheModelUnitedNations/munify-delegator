import { db, schema } from '$api/db/db';
import { isUniqueViolationOn } from '$api/services/errors/uniqueViolation';
import { normalizeRoleApplicationRanks } from '$api/services/registration/normalizeRoleApplicationRanks';
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
		if (isUniqueViolationOn(error, 'non_state_actor_conference_id')) {
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
			.insert(schema.nonStateActor)
			.values({
				conferenceId: data.conferenceId,
				name: data.name,
				abbreviation: data.abbreviation,
				description: data.description,
				fontAwesomeIcon: data.fontAwesomeIcon || null,
				seatAmount: data.seatAmount
			})
			.returning({ id: schema.nonStateActor.id })
			.then(assertFirstEntryExists)
	);
	return created.id;
}

/** Writes the update data of `nonStateActorUpdateData` to a non-state actor. */
export async function updateNonStateActor(
	id: string,
	data: Partial<typeof schema.nonStateActor.$inferInsert>
) {
	await withUniqueNameCheck(
		db.update(schema.nonStateActor).set(data).where(eq(schema.nonStateActor.id, id))
	);
}

/**
 * Deletes a non-state actor unless a delegation is assigned to it, together with the applications
 * for it.
 */
export async function deleteNonStateActor(id: string) {
	await db.transaction(async (tx) => {
		const existing = await tx.query.nonStateActor.findFirst({
			where: { id },
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
			.where(eq(schema.roleApplication.nonStateActorId, existing.id))
			.returning({ delegationId: schema.roleApplication.delegationId });
		for (const delegationId of new Set(applications.map((a) => a.delegationId))) {
			await normalizeRoleApplicationRanks(delegationId, tx);
		}

		await tx.delete(schema.nonStateActor).where(eq(schema.nonStateActor.id, existing.id));
	});
}
