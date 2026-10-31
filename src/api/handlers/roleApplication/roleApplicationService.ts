import { db, schema } from '#api/db/db';
import { roleApplicationPubsub } from '#api/pubsub';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { count } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { normalizeRoleApplicationRanks } from './normalizeRoleApplicationRanks';
import { apiError, isUniqueViolationOn } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/** Turns the unique index refusing a second wish for the same role into its error. */
async function refusingRepeatedWish<T>(write: Promise<T>) {
	try {
		return await write;
	} catch (error) {
		if (isUniqueViolationOn({ error, column: 'role_id' })) {
			throw apiError({ code: 'CONFLICT', message: m.roleApplicationAlreadyWished() });
		}
		throw error;
	}
}

/**
 * Adds a wish at the end of the delegation's ranking; a role it already wishes for is refused
 * (CONFLICT). Returns the new row's id.
 */
export async function appendRoleApplication({
	delegationId,
	roleId
}: {
	delegationId: string;
	roleId: string;
}) {
	const created = await refusingRepeatedWish(
		db.transaction(async (tx) => {
			// Close any gap first, so "one past the count" cannot collide with an existing rank.
			await normalizeRoleApplicationRanks({ delegationId, tx });
			const [existing] = await tx
				.select({ value: count() })
				.from(schema.roleApplication)
				.where(whereRows({ table: schema.roleApplication, filter: { delegationId } }));

			return tx
				.insert(schema.roleApplication)
				.values({ delegationId, roleId, rank: (existing?.value ?? 0) + 1 })
				.returning({ id: schema.roleApplication.id })
				.then(assertFirstEntryExists);
		})
	);
	roleApplicationPubsub.created();
	return created.id;
}

/**
 * Deletes a wish the caller may delete (`assertCanDeleteRoleApplication`) and closes the gap it
 * leaves in the delegation's ranking.
 */
export async function removeRoleApplication(application: { id: string; delegationId: string }) {
	await db.transaction(async (tx) => {
		await tx
			.delete(schema.roleApplication)
			.where(whereRows({ table: schema.roleApplication, filter: { id: application.id } }));
		await normalizeRoleApplicationRanks({ delegationId: application.delegationId, tx });
	});
	roleApplicationPubsub.removed();
}

/** Swaps the ranks of two wishes of one delegation (`assertCanSwapRoleApplicationRanks`). */
export async function swapRanks({
	first,
	second
}: {
	first: { id: string; rank: number };
	second: { id: string; rank: number };
}) {
	await db.transaction(async (tx) => {
		// (delegationId, rank) is unique, so the first row is parked on a sentinel rank
		// before the two are swapped. The legacy resolver used -1 for the same reason.
		await tx
			.update(schema.roleApplication)
			.set({ rank: -1 })
			.where(whereRows({ table: schema.roleApplication, filter: { id: first.id } }));
		await tx
			.update(schema.roleApplication)
			.set({ rank: first.rank })
			.where(whereRows({ table: schema.roleApplication, filter: { id: second.id } }));
		await tx
			.update(schema.roleApplication)
			.set({ rank: second.rank })
			.where(whereRows({ table: schema.roleApplication, filter: { id: first.id } }));
	});
	roleApplicationPubsub.updated([first.id, second.id]);
}
