import { m } from '#lib/paraglide/messages';
import type * as schema from '#api/db/schema/index';
import { apiError } from '#api/services/errors';
import { z } from 'zod';

/**
 * The rules of the roles the seat planning creates and edits directly (non-state actors and custom
 * roles), free of database access so they are unit tested; the service feeds them what it read.
 */

/** How many single participants a custom role seats: at least one. */
export const customRoleSeatsSchema = z.number().min(1, { error: () => m.customRoleSeatsRange() });

interface NonStateActorUpdateInput {
	name?: string | null;
	abbreviation?: string | null;
	description?: string | null;
	fontAwesomeIcon?: string | null;
	seatAmount?: number | null;
}

/**
 * Maps the optional GraphQL update arguments of a non-state actor to update data: omitted and null
 * fields stay untouched (they are all required), an empty icon clears the icon.
 */
export function nonStateActorUpdateData(
	data: NonStateActorUpdateInput
): Partial<typeof schema.conferenceRole.$inferInsert> {
	return {
		name: data.name ?? undefined,
		abbreviation: data.abbreviation ?? undefined,
		description: data.description ?? undefined,
		seatAmount: data.seatAmount ?? undefined,
		fontAwesomeIcon: data.fontAwesomeIcon === undefined ? undefined : data.fontAwesomeIcon || null
	};
}

/** Refuses (CONFLICT) to delete a non-state actor while a delegation is assigned to it. */
export function assertNonStateActorDeletable(assignedDelegations: number) {
	if (assignedDelegations > 0) {
		throw apiError({ code: 'CONFLICT', message: m.nonStateActorDeleteBlocked() });
	}
}

/**
 * Refuses (CONFLICT) to give a custom role fewer seats than people hold it: unlike a non-state
 * actor's applications, an assignment is not something to drop quietly. Left out passes.
 */
export function assertCustomRoleSeatsAllowed({
	seatAmount,
	holders
}: {
	seatAmount: number | null | undefined;
	holders: number;
}) {
	if (seatAmount != null && seatAmount < holders) {
		throw apiError({
			code: 'CONFLICT',
			message: m.customRoleSeatsBelowAssigned({ assigned: holders })
		});
	}
}

/** Refuses (CONFLICT) to delete a custom role somebody holds. */
export function assertCustomRoleDeletable(holders: number) {
	if (holders > 0) throw apiError({ code: 'CONFLICT', message: m.customRoleStillAssigned() });
}
